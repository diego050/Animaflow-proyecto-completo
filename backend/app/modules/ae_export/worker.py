"""
RQ worker entry point for AE export.
"""
import json
import os

import psycopg2
from sqlalchemy.engine.url import make_url

from app.db.models import JobModel
from app.db.session import SessionLocal, get_db_context
from app.core.resolutions import get_resolution
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("ae_export")

from .script_builder import create_ae_full_script
from .zip_exporter import create_export_zip


def _persist_job_spec(job_id: str, spec_dict: dict):
    """
    Persist job.result_spec using a separate psycopg2 connection.
    Bypasses SQLAlchemy ORM entirely to avoid JSON change detection issues.
    Works in both local (localhost) and Docker (postgres hostname) environments.
    """
    try:
        url = make_url(settings.sqlalchemy_database_uri)
        conn = psycopg2.connect(
            host=url.host,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            database=url.database
        )
        cur = conn.cursor()
        cur.execute(
            "UPDATE jobs SET result_spec = %s WHERE id = %s",
            (json.dumps(spec_dict), job_id)
        )
        conn.commit()
        logger.info("result_spec persisted for job %s", job_id)
    except psycopg2.Error as e:
        logger.error("Failed to persist result_spec for job %s: %s", job_id, e)
        raise
    except Exception as e:
        # Fallback: log unexpected error and re-raise
        logger.exception("Failed to persist result_spec for job %s: %s", job_id, e)
        raise
    finally:
        if 'conn' in locals():
            conn.close()


def generate_ae_export_async(job_id: str, force: bool = False):
    """
    RQ worker function: generates AE scripts for all scenes, then creates zip.
    Progress stored in result_spec._ae_export_status and _ae_export_progress.
    Uses separate psycopg2 connection for JSON persistence to bypass SQLAlchemy issues.
    """
    with get_db_context() as db:
        try:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if not job or not job.result_spec:
                logger.warning("Job %s not found or no spec", job_id)
                return

            scenes = job.result_spec.get('scenes', [])
            aspect_ratio = job.result_spec.get('aspect_ratio', job.aspect_ratio or "9:16")
            w, h = get_resolution(aspect_ratio)

            # Force mode: clear existing scripts to regenerate all scenes
            if force:
                cleared = 0
                for scene in scenes:
                    if scene.pop('ae_script_code', None):
                        cleared += 1
                logger.info("Force mode: cleared %d existing ae_script_code(s) for regeneration", cleared)
                _persist_job_spec(job_id, job.result_spec)

            # Initialize export status
            job.result_spec['_ae_export_status'] = 'generating'
            job.result_spec['_ae_export_progress'] = {'current': 0, 'total': len(scenes)}
            _persist_job_spec(job_id, job.result_spec)

            generated_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated"))

            for i, scene in enumerate(scenes):
                # Skip if already generated (preserves existing)
                if scene.get('ae_script_code'):
                    logger.info("Scene %d already has ae_script_code, skipping", i + 1)
                    job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
                    _persist_job_spec(job_id, job.result_spec)
                    continue

                # Read TSX from disk
                tsx_path = os.path.join(generated_dir, f"Scene_{job_id}_{i}.tsx")
                if not os.path.exists(tsx_path):
                    logger.warning("TSX not found for scene %d: %s", i + 1, tsx_path)
                    job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
                    _persist_job_spec(job_id, job.result_spec)
                    continue

                with open(tsx_path, 'r', encoding='utf-8') as f:
                    tsx_code = f.read()

                logger.info("Generating AE script for scene %d/%d...", i + 1, len(scenes))
                logger.info("TSX file: %s, exists: %s", tsx_path, os.path.exists(tsx_path))

                # Generate AE script using Deterministic engine!
                logger.info("Calling Deterministic Generator for scene %d...", i + 1)

                try:
                    from app.modules.parsers.tsx.components import parse_components_from_tsx
                    from app.modules.ae_export.deterministic.components_generator import generate_component_script
                    
                    components = parse_components_from_tsx(tsx_code)
                    bg_color = scene.get('remotion_props', {}).get('backgroundColor', '#0f172a')
                    txt_color = scene.get('remotion_props', {}).get('textColor', '#38bdf8')
                    
                    if components:
                        logger.info("Deterministic components found for scene %d", i + 1)
                        ae_script = generate_component_script(
                            components=components,
                            text=scene['text'],
                            duration=scene['duration_seconds'],
                            width=w,
                            height=h,
                            fps=30
                        )
                    else:
                        # 1. Parse SVG geometries
                        from app.modules.parsers.svg.extractor import parse_svg_from_tsx
                        from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae
                        from app.modules.ae_export.deterministic import generate_deterministic_script
    
                        svg_elements = parse_svg_from_tsx(tsx_code)
    
                        # 2. Extract Remotion animations and metadata
                        enriched_data = analyze_tsx_for_ae(tsx_code, w, h, 30)
    
                        # 3. Generate .jsx
                        ae_script = generate_deterministic_script(
                            svg_elements=svg_elements,
                            enriched=enriched_data,
                            text=scene['text'],
                            duration=scene['duration_seconds'],
                            bg_color=bg_color,
                            text_color=txt_color,
                            width=w,
                            height=h,
                            fps=30
                        )
                    logger.info("Deterministic result for scene %d: OK (length: %d chars)", i + 1, len(ae_script))
                except (ValueError, KeyError, OSError) as script_e:
                    logger.error("Deterministic generation failed for scene %d: %s", i + 1, script_e)
                    ae_script = None
                except Exception as script_e:
                    # Fallback: log unexpected error and continue with next scene
                    logger.exception("Deterministic generation failed for scene %d: %s", i + 1, script_e)
                    ae_script = None

                if ae_script:
                    # Wrap with individual undo group
                    ae_script = f'app.beginUndoGroup("AnimaFlow Scene {i+1}");\n{ae_script}\napp.endUndoGroup();'
                    scene['ae_script_code'] = ae_script
                    _persist_job_spec(job_id, job.result_spec)
                    logger.info("AE script persisted to DB for scene %d (len=%d)", i + 1, len(ae_script))
                else:
                    logger.error("AE script generation failed for scene %d", i + 1)

                # Update progress
                job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
                _persist_job_spec(job_id, job.result_spec)

            # Close ORM transaction and re-query to get fresh data from DB
            db.commit()
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            logger.info("Re-loaded job from DB, scenes count: %d", len(job.result_spec.get('scenes', [])))
            for i, s in enumerate(job.result_spec.get('scenes', [])):
                has_ae = 'ae_script_code' in s and s['ae_script_code']
                logger.info("  Scene %d: ae_script_code=%s (len=%d)", i + 1, 'YES' if has_ae else 'NO', len(s.get('ae_script_code', '')) if has_ae else 0)

            logger.info("Creating export zip for job %s...", job_id)
            zip_path, zip_filename = create_export_zip(job_id, db)

            if zip_path:
                job.result_spec['_ae_export_status'] = 'completed'
                job.result_spec['_ae_export_zip_path'] = zip_path
                job.result_spec['_ae_export_filename'] = zip_filename
                logger.info("Export completed: %s", zip_filename)
                _persist_job_spec(job_id, job.result_spec)
            else:
                job.result_spec['_ae_export_status'] = 'failed'
                logger.error("Failed to create zip")
                _persist_job_spec(job_id, job.result_spec)

        except (OSError, psycopg2.Error, ValueError) as e:
            logger.error("Error: %s", e)
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if job and job.result_spec:
                job.result_spec['_ae_export_status'] = f'failed: {str(e)}'
                _persist_job_spec(job_id, job.result_spec)
        except Exception as e:
            # Fallback: mark export as failed on any unexpected error
            logger.exception("Error: %s", e)
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if job and job.result_spec:
                job.result_spec['_ae_export_status'] = f'failed: {str(e)}'
                _persist_job_spec(job_id, job.result_spec)
