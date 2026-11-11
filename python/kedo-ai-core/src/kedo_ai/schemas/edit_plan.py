from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


class FrameRange(BaseModel):
    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=0)

    @model_validator(mode="after")
    def ordered(self) -> FrameRange:
        if self.end_frame < self.start_frame:
            raise ValueError("end_frame must be >= start_frame")
        return self


class ReplaceClipRange(BaseModel):
    type: Literal["replace_clip_range"]
    target_clip_id: str
    range: FrameRange
    source_asset_id: str
    source_in_frame: int = Field(ge=0)


class AdjustGrade(BaseModel):
    type: Literal["adjust_grade"]
    scope: str
    parameters: dict[str, float]


class SlipClip(BaseModel):
    type: Literal["slip_clip"]
    clip_id: str
    delta_frames: int


class RazorCut(BaseModel):
    type: Literal["razor_cut"]
    track_id: str
    at_frame: int = Field(ge=0)


EditOperation = Annotated[
    ReplaceClipRange | AdjustGrade | SlipClip | RazorCut,
    Field(discriminator="type"),
]


class EditPlanConstraints(BaseModel):
    preserve_master_audio: bool | None = None
    no_synthetic_content: bool | None = None
    authenticity_lock: bool | None = None


class EditPlan(BaseModel):
    """Unexecuted timeline plan — never treat as already applied (AGT / §8.5)."""

    schema_version: Literal["1.0"] = "1.0"
    project_id: str
    sequence_id: str
    expected_revision: int = Field(ge=0)
    mode: Literal["preview_then_apply", "apply_with_confirmation", "draft_only"]
    intent: str
    constraints: EditPlanConstraints = Field(default_factory=EditPlanConstraints)
    operations: list[EditOperation] = Field(min_length=1, max_length=64)
    require_confirmation: bool = False


class EditPlanRequest(BaseModel):
    project_id: str
    sequence_id: str
    expected_revision: int = Field(ge=0)
    prompt: str = Field(min_length=1, max_length=4000)
    mode: Literal["preview_then_apply", "apply_with_confirmation", "draft_only"] = (
        "preview_then_apply"
    )
    constraints: EditPlanConstraints = Field(default_factory=EditPlanConstraints)
    # Cloud spend gate — required for non-mock providers (AGT / SEC).
    cloud_consent: bool = False
    privacy_mode: Literal["local_first", "cloud_allowed"] = "local_first"


def validate_edit_plan(plan: EditPlan) -> EditPlan:
    """Re-validate after provider output; raises ValidationError on failure."""
    return EditPlan.model_validate(plan.model_dump())
