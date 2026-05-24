"""
Integration snapshot tests for the pipeline.
Run these BEFORE and AFTER Fase 3 modularization to verify zero behavior change.
"""
import json
import os
import pytest
from unittest.mock import patch, AsyncMock, Mock

from app.db.models import JobModel
from app.modules.pipeline.orchestrator import run_pipeline, run_pipeline_approved
from app.modules.llm.visual_spec import BatchVisualSpec, VisualSpecResult

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
    # (sample_script has 3 sentences → 2 chunks (grouped by ~7s duration))
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
        "app.modules.pipeline.orchestrator.decide_and_generate_component",
        new_callable=AsyncMock,
        return_value=("Scene_test", "passed", None, None),
    ) as mock_component, patch(
        "app.modules.pipeline.orchestrator.render_single_scene",
        return_value="http://test/scene.mp4",
    ) as mock_render, patch(
        "app.modules.pipeline.orchestrator.concat_scenes",
        return_value="http://test/final.mp4",
    ) as mock_concat, patch(
        "app.modules.pipeline.orchestrator.write_index_ts"
    ) as mock_index, patch(
        "app.modules.pipeline.orchestrator.AUDIO_STORAGE", audio_storage
    ):
        yield {
            "batch": mock_batch,
            "tts": mock_tts,
            "component": mock_component,
            "render": mock_render,
            "concat": mock_concat,
            "index": mock_index,
            "batch_visuals": batch_visuals,
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

        # Phase 1: Segment — signature matches the real jobs.py enqueue call
        run_pipeline(job.id, sample_script, "9:16", None)

        # Refresh job from DB (run_pipeline uses its own session)
        db_session.refresh(job)

        # Assert: job segmented
        assert job.status == "segmented"

        # Assert: result_spec exists and has expected structure
        spec = job.result_spec
        assert spec is not None
        assert "scenes" in spec
        assert len(spec["scenes"]) > 0

        # Phase 1 scenes are preliminary: media_query may be empty, duration is 0, type is pending
        for i, scene in enumerate(spec["scenes"]):
            assert "text" in scene, f"Scene {i} missing text"
            assert "media_query" in scene, f"Scene {i} missing media_query"
            assert "duration_seconds" in scene, f"Scene {i} missing duration_seconds"
            assert "type" in scene, f"Scene {i} missing type"
            assert "remotion_props" in scene, f"Scene {i} missing remotion_props"

        # Phase 2: Approve scenes (simulate user approval)
        run_pipeline_approved(job.id, None)
        db_session.refresh(job)

        # Assert: job completed
        assert job.status == "completed"

        # Assert: each scene now has generated fields
        spec = job.result_spec
        for i, scene in enumerate(spec["scenes"]):
            assert scene["duration_seconds"] > 0, f"Scene {i} duration must be positive"

    def test_pipeline_spec_snapshot(self, db_session, sample_script, mock_external_services):
        """Compare spec output against deterministic mock values."""
        job = JobModel(
            script_text=sample_script,
            aspect_ratio="9:16",
            status="pending",
        )
        db_session.add(job)
        db_session.commit()

        # Phase 1: Segment
        run_pipeline(job.id, sample_script, "9:16", None)
        db_session.refresh(job)
        assert job.status == "segmented"

        # Phase 2: Approve and generate visuals
        run_pipeline_approved(job.id, None)
        db_session.refresh(job)
        assert job.status == "completed"

        spec = job.result_spec
        assert spec is not None
        expected_scenes = mock_external_services["batch_visuals"].scenes

        # Compare key structure against deterministic mock values
        assert len(spec["scenes"]) == len(expected_scenes)
        for i, (actual, expected) in enumerate(zip(spec["scenes"], expected_scenes)):
            assert actual["text"] and len(actual["text"]) > 0, f"Scene {i} text is empty"
            assert actual["media_query"] == expected.media_query, f"Scene {i} media_query mismatch"
            assert actual["type"] == "Scene_test", f"Scene {i} type mismatch"
            assert actual["remotion_props"] == {
                "backgroundColor": expected.backgroundColor,
                "textColor": expected.textColor,
            }, f"Scene {i} remotion_props mismatch"


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
            "app.modules.pipeline.orchestrator.decide_and_generate_component",
            new_callable=AsyncMock,
            return_value=("Scene_test", "passed", None, None),
        ), patch(
            "app.modules.pipeline.orchestrator.render_single_scene",
            return_value="http://test/scene.mp4",
        ), patch(
            "app.modules.pipeline.orchestrator.concat_scenes",
            return_value="http://test/final.mp4",
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

        # Phase 1: Segment
        run_pipeline(job.id, script, "9:16", None)
        db_session.refresh(job)
        assert job.status == "segmented"

        # Phase 2: Approve and generate visuals
        run_pipeline_approved(job.id, None)
        db_session.refresh(job)
        assert job.status == "completed"
        first_spec = job.result_spec

        # Re-run phase 1 + 2
        run_pipeline(job.id, script, "9:16", None)
        db_session.refresh(job)
        assert job.status == "segmented"

        run_pipeline_approved(job.id, None)
        db_session.refresh(job)
        assert job.status == "completed"
        second_spec = job.result_spec

        assert first_spec == second_spec
