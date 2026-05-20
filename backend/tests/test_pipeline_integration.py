"""
Integration snapshot tests for the pipeline.
Run these BEFORE and AFTER Fase 3 modularization to verify zero behavior change.
"""
import json
import os
import pytest
from unittest.mock import patch, AsyncMock, Mock

from app.db.models import JobModel
from app.modules.pipeline.orchestrator import run_pipeline
from app.modules.llm.visual_spec import BatchVisualSpec, VisualSpecResult

SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), "snapshots")
SNAPSHOT_PATH = os.path.join(SNAPSHOT_DIR, "pipeline_spec_snapshot.json")


@pytest.fixture
def sample_script():
    return (
        "El chocolate no es un capricho. Es una experiencia sensorial que combina "
        "textura, aroma y sabor en cada bocado. Descubre por qué el cacao fino "
        "de origen está revolucionando la industria."
    )


@pytest.fixture
def mock_external_services(tmp_path):
    """
    Patches all external API calls and file I/O used by the pipeline.
    Yields a dict with the mock objects for inspection if needed.
    """
    # Temporary audio storage directory
    audio_storage = str(tmp_path / "audio")
    os.makedirs(audio_storage, exist_ok=True)

    # Build deterministic BatchVisualSpec with enough scenes for the sample script
    # (sample_script has 3 sentences → 3 chunks)
    batch_visuals = BatchVisualSpec(
        scenes=[
            VisualSpecResult(
                media_query="A cinematic wide shot of a futuristic landscape",
                backgroundColor="#0f172a",
                textColor="#38bdf8",
            ),
            VisualSpecResult(
                media_query="A heart shape forming from connected dots with warm golden light",
                backgroundColor="#1e293b",
                textColor="#fbbf24",
            ),
            VisualSpecResult(
                media_query="Water drops falling into a pool creating expanding ripple circles",
                backgroundColor="#0f172a",
                textColor="#38bdf8",
            ),
        ]
    )

    with patch(
        "app.modules.pipeline.orchestrator.generate_batch_visuals_with_llm",
        return_value=batch_visuals,
    ) as mock_batch, patch(
        "app.modules.pipeline.orchestrator.generate_tts_with_timestamps",
        new_callable=AsyncMock,
        return_value={"audio_path": "http://test/audio.mp3", "duration_seconds": 5.0, "word_timestamps": []},
    ) as mock_tts, patch(
        "app.modules.pipeline.orchestrator.generate_remotion_component",
        new_callable=AsyncMock,
        return_value="Scene_test",
    ) as mock_remotion, patch(
        "app.modules.pipeline.orchestrator.write_index_ts"
    ) as mock_index, patch(
        "app.modules.pipeline.orchestrator.AUDIO_STORAGE", audio_storage
    ):
        yield {
            "batch": mock_batch,
            "tts": mock_tts,
            "remotion": mock_remotion,
            "index": mock_index,
        }


class TestPipelineSnapshot:
    """Snapshot tests that verify spec.json output doesn't change during refactoring."""

    def test_pipeline_produces_valid_spec(
        self, db_session, sample_script, mock_external_services
    ):
        """Pipeline produces a valid TimelineSpec with expected structure."""
        # Create a test job
        job = JobModel(
            script_text=sample_script,
            aspect_ratio="9:16",
            status="pending",
        )
        db_session.add(job)
        db_session.commit()

        # Run pipeline — signature matches the real jobs.py enqueue call
        run_pipeline(job.id, sample_script, "9:16", None)

        # Refresh job from DB (run_pipeline uses its own session)
        db_session.refresh(job)

        # Assert: job completed
        assert job.status == "completed"

        # Assert: result_spec exists and has expected structure
        spec = job.result_spec
        assert spec is not None
        assert "scenes" in spec
        assert len(spec["scenes"]) > 0

        # Assert: each scene has required fields
        for i, scene in enumerate(spec["scenes"]):
            assert "text" in scene, f"Scene {i} missing text"
            assert "media_query" in scene, f"Scene {i} missing media_query"
            assert "duration_seconds" in scene, f"Scene {i} missing duration_seconds"
            assert "type" in scene, f"Scene {i} missing type"
            assert "remotion_props" in scene, f"Scene {i} missing remotion_props"
            assert scene["duration_seconds"] > 0, f"Scene {i} duration must be positive"

    def test_pipeline_spec_snapshot(
        self, db_session, sample_script, mock_external_services
    ):
        """Compare spec output against saved snapshot."""
        job = JobModel(
            script_text=sample_script,
            aspect_ratio="9:16",
            status="pending",
        )
        db_session.add(job)
        db_session.commit()

        run_pipeline(job.id, sample_script, "9:16", None)
        db_session.refresh(job)

        spec = job.result_spec

        # Create snapshot directory if it doesn't exist
        os.makedirs(SNAPSHOT_DIR, exist_ok=True)

        if not os.path.exists(SNAPSHOT_PATH):
            # First run: save snapshot and skip
            with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
                json.dump(spec, f, indent=2, default=str)
            pytest.skip("Snapshot created. Re-run to validate.")

        # Compare against saved snapshot
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            expected = json.load(f)

        # Compare key structure (ignore timestamps that may vary)
        assert len(spec["scenes"]) == len(expected["scenes"])
        for i, (actual, exp) in enumerate(zip(spec["scenes"], expected["scenes"])):
            assert actual["text"] == exp["text"], f"Scene {i} text mismatch"
            assert (
                actual["media_query"] == exp["media_query"]
            ), f"Scene {i} media_query mismatch"
            assert actual["type"] == exp["type"], f"Scene {i} type mismatch"
            assert (
                actual["remotion_props"] == exp["remotion_props"]
            ), f"Scene {i} remotion_props mismatch"


class TestPipelineIdempotency:
    """Verify pipeline is idempotent — running twice on same job produces same result."""

    @pytest.fixture
    def mock_external_services_idempotency(self, tmp_path):
        """Minimal mocks for the idempotency test (2-chunk script)."""
        audio_storage = str(tmp_path / "audio")
        os.makedirs(audio_storage, exist_ok=True)

        batch_visuals = BatchVisualSpec(
            scenes=[
                VisualSpecResult(
                    media_query="Test media query one",
                    backgroundColor="#0f172a",
                    textColor="#38bdf8",
                ),
                VisualSpecResult(
                    media_query="Test media query two",
                    backgroundColor="#1e293b",
                    textColor="#fbbf24",
                ),
            ]
        )

        with patch(
            "app.modules.pipeline.orchestrator.generate_batch_visuals_with_llm",
            return_value=batch_visuals,
        ), patch(
            "app.modules.pipeline.orchestrator.generate_tts_with_timestamps",
            new_callable=AsyncMock,
            return_value={"audio_path": "http://test/audio.mp3", "duration_seconds": 3.0, "word_timestamps": []},
        ), patch(
            "app.modules.pipeline.orchestrator.generate_remotion_component",
            new_callable=AsyncMock,
            return_value="Scene_test",
        ), patch(
            "app.modules.pipeline.orchestrator.write_index_ts"
        ), patch(
            "app.modules.pipeline.orchestrator.AUDIO_STORAGE", audio_storage
        ):
            yield

    def test_rerun_pipeline_same_output(
        self, db_session, mock_external_services_idempotency
    ):
        """Running pipeline twice on same job should not change spec."""
        script = "Test script for idempotency. Second sentence for segmentation."
        job = JobModel(
            script_text=script,
            aspect_ratio="9:16",
            status="pending",
        )
        db_session.add(job)
        db_session.commit()

        run_pipeline(job.id, script, "9:16", None)
        db_session.refresh(job)
        first_spec = job.result_spec

        # Re-run
        run_pipeline(job.id, script, "9:16", None)
        db_session.refresh(job)
        second_spec = job.result_spec

        assert first_spec == second_spec
