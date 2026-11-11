"""Cloud provider consent checks (AGT / SEC)."""

from __future__ import annotations


def assert_cloud_consent(
    *,
    provider: str,
    cloud_consent: bool = False,
    privacy_mode: str = "local_first",
) -> None:
    p = (provider or "mock").strip().lower()
    if p in {"mock", "local"}:
        return
    if privacy_mode == "local_first":
        raise PermissionError(
            "privacy_mode=local_first blocks non-mock cloud providers"
        )
    if not cloud_consent:
        raise PermissionError("cloud_consent required for non-mock AI providers")
