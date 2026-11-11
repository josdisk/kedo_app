from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from kedo_ai.schemas.edit_plan import EditPlan, EditPlanRequest, validate_edit_plan
from kedo_ai.schemas.first_cut import FirstCutRequest, FirstCutResult, plan_first_cut
from kedo_ai_api.adapters import get_adapter
from kedo_ai_api.settings import settings

app = FastAPI(
    title="KeDo Smart V AI Gateway",
    version="0.1.0",
    description=(
        "Returns schema-validated EditPlan objects that are NOT executed. "
        "Apply only via authorized project APIs after confirmation (AGT)."
    ),
)


class HealthResponse(BaseModel):
    status: str
    service: str
    provider: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="kedov-ai-api", provider=settings.provider)


@app.post("/ai/plans", response_model=EditPlan)
def create_plan(body: EditPlanRequest) -> EditPlan:
    """Accept one typed prompt; return an unexecuted EditPlan."""
    try:
        adapter = get_adapter(settings.provider, body)
        plan = adapter.create_plan(body)
        return validate_edit_plan(plan)
    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "cloud_consent_required",
                "human_message": str(exc),
                "retryable": False,
            },
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "provider_unavailable",
                "human_message": str(exc),
                "retryable": False,
            },
        ) from exc


@app.post("/ai/first-cut", response_model=FirstCutResult)
def create_first_cut(body: FirstCutRequest) -> FirstCutResult:
    """Genre-aware first cut → unexecuted EditPlan (EDT). Never auto-applies."""
    return plan_first_cut(body)
