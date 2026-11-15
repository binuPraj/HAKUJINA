import pytest

@pytest.fixture(autouse=True)
def mock_dns_mx(monkeypatch):
    """
    Prevent tests from performing live external DNS MX lookups, which time out
    or fail when testing with mock/test domains (e.g. @example.com).
    """
    try:
        monkeypatch.setattr(
            "apps.users.serializers.resolver.resolve",
            lambda *args, **kwargs: True,
        )
    except Exception:
        pass
