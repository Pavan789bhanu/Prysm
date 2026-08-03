"""Shared analysis execution used by sync requests and background workers."""
from __future__ import annotations

import models
import storage


def run_analysis_task(analysis_id: int) -> None:
    """Execute a queued/processing analysis and persist the outcome."""
    from analyst_service import run_analysis

    analysis = models.get_analysis_by_id(analysis_id)
    if not analysis:
        return

    if analysis["status"] == "cancelled" or models.is_analysis_cancel_requested(analysis_id):
        models.update_analysis(
            analysis_id, status="cancelled", error_message="Cancelled by user."
        )
        return

    dataset = models.get_dataset_by_id(analysis["dataset_id"])
    if not dataset:
        models.update_analysis(
            analysis_id, status="failed", error_message="Dataset not found."
        )
        return

    models.update_analysis(analysis_id, status="processing")
    try:
        local_path = storage.get_local_path(dataset["file_key"])
        result = run_analysis(local_path, analysis["query"])
        if models.is_analysis_cancel_requested(analysis_id):
            models.update_analysis(
                analysis_id, status="cancelled", error_message="Cancelled by user."
            )
            return
        models.update_analysis(
            analysis_id,
            status="completed",
            plan=result.get("plan"),
            plan_desc=result.get("plan_desc"),
            output=result.get("output"),
            agent_outputs=result.get("agent_outputs"),
            dataset_preview=result.get("dataset_preview"),
            charts=result.get("charts"),
            insights=result.get("insights"),
            execution=result.get("execution"),
            summary=result.get("summary"),
        )
    except Exception as exc:
        if models.is_analysis_cancel_requested(analysis_id):
            models.update_analysis(
                analysis_id, status="cancelled", error_message="Cancelled by user."
            )
            return
        models.update_analysis(analysis_id, status="failed", error_message=str(exc))
