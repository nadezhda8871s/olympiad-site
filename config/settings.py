
# -*- coding: utf-8 -*-

Django settings — hardened for Render + custom domain (vsemnauka.ru).
This file **replaces your existing config/settings.py**.
Key fixes:
- Correct parsing of ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS from env (comma-separated).
- Proper proxy/SSL headers for Render.
- Health check middleware for /healthz without touching urls.py.
- Optional Host header debug (enable via ENABLE_HOST_DEBUG=1).

Compatible with Django 5.x.


Copyright: you



import os
from pathlib import Path
from typing import List

# -----------------------
# Base paths
# -----------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------
# Helpers
# -----------------------
def env_bool(key: str, default: bool=False) -> bool:
    v = os.getenv(key)
    if v is None:
        return default
    return str(v).strip().lower() in {"1", "true", "yes", "on"}

def env_list(key: str, default: List[str] | None = None) -> List[str]:
    raw = os.getenv(key)
    if not raw:
        return list(default or [])
    return [item.strip() for item in raw.split(",") if item.strip()]

def env_str(key: str, default: str="") -> str:
    v = os.getenv(key)
    return v if v is not None else default

# -----------------------
# Core
# -----------------------
SECRET_KEY = env_str("DJANGO_SECRET_KEY", "unsafe-secret-key-change-in-env")
DEBUG = env_bool("DEBUG", env_bool("DJANGO_DEBUG", False))

# IMPORTANT: we **split** comma-separated ALLOWED_HOSTS correctly
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", [".onrender.com", "www.vsemnauka.ru", "vsemnauka.ru", "localhost", "127.0.0.1"])

# CSRF trusted origins must include scheme
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    ["https://olympiad-site-1.onrender.com", "https://www.vsemnauka.ru", "https://vsemnauka.ru"]
)

# Recognize HTTPS behind Render proxy
# https://docs.render.com/web-services#django
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)

# Time/locale
LANGUAGE_CODE = "ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------
# Installed apps
# -----------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # project apps
    "pages",
    "events",
]

# -----------------------
# Middleware
# -----------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Health check without touching urls.py
    "config.health_middleware.HealthCheckMiddleware",
]

# Optional host debug (add only if ENABLE_HOST_DEBUG=1)
if env_bool("ENABLE_HOST_DEBUG", False):
    MIDDLEWARE.insert(0, "config.host_debug_middleware.HostHeaderDebugMiddleware")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# -----------------------
# Templates
# -----------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# -----------------------
# Database (Render Postgres via DATABASE_URL if provided, else sqlite for dev)
# -----------------------
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# -----------------------
# Static files (WhiteNoise)
# -----------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

# Enable WhiteNoise compression & caching
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}

# -----------------------
# Email
# -----------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env_str("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(env_str("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = env_str("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env_str("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = env_str("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "no-reply@vsemnauka.ru")

# -----------------------
# Logging - include warnings in Render logs
# -----------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO" if not DEBUG else "DEBUG",
    },
    "loggers": {
        "django.security.DisallowedHost": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
