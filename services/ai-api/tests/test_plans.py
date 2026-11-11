from fastapi.testclient import TestClient

from kedo_ai_api.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_plan_returns_unexecuted_edit_plan() -> None:
    res = client.post(
        "/ai/plans",
        json={
            "project_id": "proj_demo",
            "sequence_id": "seq_main",
            "expected_revision": 43,
            "prompt": "Replace the chorus shot with Take 4 close-up and soften blue grade",
            "constraints": {"preserve_master_audio": True, "no_synthetic_content": True},
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["schema_version"] == "1.0"
    assert data["project_id"] == "proj_demo"
    assert len(data["operations"]) >= 1
    types = {op["type"] for op in data["operations"]}
    assert "replace_clip_range" in types
    assert "adjust_grade" in types


def test_rejects_empty_prompt() -> None:
    res = client.post(
        "/ai/plans",
        json={
            "project_id": "proj_demo",
            "sequence_id": "seq_main",
            "expected_revision": 0,
            "prompt": "",
        },
    )
    assert res.status_code == 422


def test_cloud_provider_without_consent_forbidden(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    from kedo_ai_api.settings import Settings

    # Recreate settings read is cached on module — patch settings.provider directly.
    import kedo_ai_api.main as main_mod

    monkeypatch.setattr(main_mod.settings, "provider", "openai")
    res = client.post(
        "/ai/plans",
        json={
            "project_id": "proj_demo",
            "sequence_id": "seq_main",
            "expected_revision": 0,
            "prompt": "soft grade",
            "cloud_consent": False,
            "privacy_mode": "local_first",
        },
    )
    assert res.status_code == 403
