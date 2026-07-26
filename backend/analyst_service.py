from __future__ import annotations

import json
import os
import sys
from typing import Any

import pandas as pd

# Make the project root importable for data_analyst_system. Append (don't
# insert at index 0) so this never shadows backend modules like `app` with
# similarly named files in the project root.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.append(_ROOT)

from data_analyst_system import (
    DataAnalyst,
    Data_Viz,
    preprocessing_agent,
    statistical_analytics_agent,
)

_analyst: DataAnalyst | None = None


def get_analyst() -> DataAnalyst:
    global _analyst
    if _analyst is None:
        _analyst = DataAnalyst(
            [preprocessing_agent, statistical_analytics_agent, Data_Viz]
        )
    return _analyst


def configure_openai() -> None:
    """Configure DSPy with the OpenAI language model."""
    import dspy

    from config import OPENAI_API_KEY

    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is not set. Add it to backend/.env to run analyses."
        )

    # dspy >= 2.4 API — dspy.LM replaces the deprecated dspy.OpenAI
    lm = dspy.LM(model="openai/gpt-3.5-turbo", api_key=OPENAI_API_KEY)
    dspy.configure(lm=lm)


def _to_jsonable(value: Any) -> Any:
    """Best-effort conversion of an agent field value to a JSON-safe type."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def serialize_prediction(prediction: Any) -> dict[str, Any]:
    """Convert a DSPy Prediction object to a plain dict for JSON storage.

    DSPy ``Prediction`` objects keep their output fields in an internal
    ``_store`` mapping, so naively filtering out underscore-prefixed
    ``__dict__`` keys returns an empty dict and the per-agent outputs vanish
    in the UI. We prefer the dict-like ``items()`` interface, then fall back
    to progressively cruder strategies.
    """
    # 1. dict-like access (dspy.Prediction / dspy.Example expose items()).
    try:
        items = dict(prediction.items())
        if items:
            return {key: _to_jsonable(value) for key, value in items.items()}
    except Exception:
        pass

    # 2. Legacy toDict() helper.
    if hasattr(prediction, "toDict"):
        try:
            return {k: _to_jsonable(v) for k, v in prediction.toDict().items()}
        except Exception:
            pass

    # 3. Internal store, then plain public attributes.
    store = getattr(prediction, "_store", None)
    if isinstance(store, dict) and store:
        return {key: _to_jsonable(value) for key, value in store.items()}

    if hasattr(prediction, "__dict__"):
        public = {
            key: _to_jsonable(value)
            for key, value in prediction.__dict__.items()
            if not key.startswith("_")
        }
        if public:
            return public

    return {"value": str(prediction)}


def run_analysis(dataset_path: str, query: str) -> dict[str, Any]:
    from config import use_demo_analysis
    from demo_service import build_demo_analysis
    from executor import execute_analysis_code

    if use_demo_analysis():
        result = build_demo_analysis(dataset_path, query)
    else:
        configure_openai()
        dataset = pd.read_csv(dataset_path)
        analyst = get_analyst()
        output, agent_outputs = analyst.forward(dataset, query)

        serialized_outputs = {
            name: serialize_prediction(result)
            for name, result in agent_outputs.items()
        }

        plan = None
        plan_desc = None
        planner_output = serialized_outputs.get("PlannerAgent") or serialized_outputs.get(
            "planner"
        )
        if isinstance(planner_output, dict):
            plan = planner_output.get("plan")
            plan_desc = planner_output.get("plan_desc")

        result = {
            "output": output,
            "agent_outputs": serialized_outputs,
            "plan": plan,
            "plan_desc": plan_desc,
            "dataset_preview": {
                "rows": len(dataset),
                "columns": list(dataset.columns),
                "sample": json.loads(
                    dataset.head(5).to_json(orient="records", date_format="iso")
                ),
            },
            "demo_mode": False,
        }

    execution = execute_analysis_code(result.get("output") or "", dataset_path)
    result["execution"] = {
        "success": execution.get("success"),
        "stdout": execution.get("stdout"),
        "stderr": execution.get("stderr"),
    }
    result["charts"] = execution.get("charts") or []
    result["insights"] = execution.get("insights")
    return result
