from fastapi.testclient import TestClient

from kedo_ai_api.main import app

client = TestClient(app)


def test_first_cut_endpoint() -> None:
    res = client.post(
        "/ai/first-cut",
        json={
            "project_id": "proj_demo",
            "sequence_id": "seq_main",
            "expected_revision": 0,
            "genre": "music_video",
            "candidates": [
                {
                    "asset_id": "asset_take4_close",
                    "take_id": "take_4",
                    "sync_confidence": 0.9,
                    "start_frame": 0,
                    "end_frame": 72,
                    "source_in_frame": 0,
                    "tags": ["close_up"],
                }
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["plan"]["schema_version"] == "1.0"
    assert data["plan"]["require_confirmation"] is True
    assert data["plan"]["constraints"]["preserve_master_audio"] is True
