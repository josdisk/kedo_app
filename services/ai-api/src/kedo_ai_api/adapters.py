from __future__ import annotations

import re

from kedo_ai.schemas.cloud_consent import assert_cloud_consent
from kedo_ai.schemas.edit_plan import (
    AdjustGrade,
    EditPlan,
    EditPlanRequest,
    ReplaceClipRange,
    SlipClip,
)


class PlanAdapter:
    def create_plan(self, request: EditPlanRequest) -> EditPlan:
        raise NotImplementedError


class MockPlanAdapter(PlanAdapter):
    """Deterministic local adapter — never calls external APIs (AGT)."""

    def create_plan(self, request: EditPlanRequest) -> EditPlan:
        prompt = request.prompt.lower()
        operations: list[ReplaceClipRange | AdjustGrade | SlipClip] = []

        if "grade" in prompt or "blue" in prompt or "colour" in prompt or "color" in prompt:
            operations.append(
                AdjustGrade(
                    type="adjust_grade",
                    scope="scene_inferred",
                    parameters={"blue_saturation_delta": -0.08},
                )
            )

        take_match = re.search(r"take\s+(\d+)", prompt)
        if "replace" in prompt or "close-up" in prompt or take_match:
            take_n = take_match.group(1) if take_match else "4"
            operations.append(
                ReplaceClipRange(
                    type="replace_clip_range",
                    target_clip_id="clip_48",
                    range={"start_frame": 2016, "end_frame": 2112},
                    source_asset_id=f"asset_take{take_n}_close",
                    source_in_frame=876,
                )
            )

        if "slip" in prompt:
            operations.append(
                SlipClip(type="slip_clip", clip_id="clip_48", delta_frames=-2)
            )

        if not operations:
            operations.append(
                SlipClip(type="slip_clip", clip_id="clip_preview", delta_frames=0)
            )

        return EditPlan(
            schema_version="1.0",
            project_id=request.project_id,
            sequence_id=request.sequence_id,
            expected_revision=request.expected_revision,
            mode=request.mode,
            intent=request.prompt.strip(),
            constraints=request.constraints,
            operations=operations,
            require_confirmation=request.mode != "draft_only",
        )


class UnconfiguredCloudAdapter(PlanAdapter):
    """Stub for openai/anthropic/xai — consent must pass; credentials not invented."""

    def __init__(self, provider: str) -> None:
        self.provider = provider

    def create_plan(self, request: EditPlanRequest) -> EditPlan:
        raise RuntimeError(
            f"Provider '{self.provider}' consented but credentials are not configured. "
            "Supply provider keys via env only after explicit approval — never invent calls."
        )


def get_adapter(provider: str, request: EditPlanRequest | None = None) -> PlanAdapter:
    p = (provider or "mock").strip().lower()
    if request is not None:
        assert_cloud_consent(
            provider=p,
            cloud_consent=bool(request.cloud_consent),
            privacy_mode=request.privacy_mode,
        )
    if p == "mock":
        return MockPlanAdapter()
    if p in {"openai", "anthropic", "xai"}:
        return UnconfiguredCloudAdapter(p)
    raise RuntimeError(
        f"Provider '{provider}' is not configured. Set AI_PROVIDER=mock or supply credentials."
    )
