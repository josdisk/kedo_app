import pytest

from kedo_ai.schemas.cloud_consent import assert_cloud_consent


def test_mock_ok():
    assert_cloud_consent(provider="mock")


def test_openai_requires_consent():
    with pytest.raises(PermissionError):
        assert_cloud_consent(provider="openai", cloud_consent=False)


def test_openai_local_first_blocked():
    with pytest.raises(PermissionError):
        assert_cloud_consent(
            provider="openai", cloud_consent=True, privacy_mode="local_first"
        )


def test_openai_allowed_with_consent():
    assert_cloud_consent(
        provider="openai", cloud_consent=True, privacy_mode="cloud_allowed"
    )
