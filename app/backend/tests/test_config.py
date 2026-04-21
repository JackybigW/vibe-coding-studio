from core.config import Settings


def test_settings_provide_auth_defaults_when_env_is_missing(monkeypatch):
    for key in (
        "JWT_SECRET_KEY",
        "JWT_ALGORITHM",
        "JWT_EXPIRE_MINUTES",
        "OIDC_ISSUER_URL",
        "OIDC_CLIENT_ID",
        "OIDC_CLIENT_SECRET",
        "OIDC_SCOPE",
        "FRONTEND_URL",
    ):
        monkeypatch.delenv(key, raising=False)

    settings = Settings(_env_file=None)

    assert settings.jwt_secret_key == ""
    assert settings.jwt_algorithm == "HS256"
    assert settings.jwt_expire_minutes == 1440
    assert settings.oidc_issuer_url == ""
    assert settings.oidc_client_id == ""
    assert settings.oidc_client_secret == ""
    assert settings.oidc_scope == "openid email profile"
    assert settings.frontend_url == "http://localhost:3000"
