from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parents[3]
_ENV_FILES = (".env", str(_ROOT_DIR / ".env"))


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "ourapp"
    BACKEND_PORT: int = 8000
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    REDIS_URL: str = "redis://redis:6379/0"

    # Supabase / Auth configuration
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    SUPABASE_JWKS_URL: str | None = None
    SUPABASE_JWT_ISSUER: str | None = None

    # Meta / Instagram configuration
    INSTAGRAM_VERIFY_TOKEN: str = ""
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    INSTAGRAM_BOT_USERNAME: str = "save.this.for.me"

    @property
    def database_key(self) -> str:
        """Returns the most privileged server key available for database operations."""
        return (
            self.SUPABASE_SERVICE_ROLE_KEY
            or self.SUPABASE_SECRET_KEY
            or self.SUPABASE_PUBLISHABLE_KEY
        )

    @property
    def resolved_jwks_url(self) -> str | None:
        if self.SUPABASE_JWKS_URL:
            return self.SUPABASE_JWKS_URL
        if self.SUPABASE_URL:
            return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return None

    @property
    def resolved_jwt_issuer(self) -> str | None:
        if self.SUPABASE_JWT_ISSUER:
            return self.SUPABASE_JWT_ISSUER
        if self.SUPABASE_URL:
            return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1"
        return None

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
