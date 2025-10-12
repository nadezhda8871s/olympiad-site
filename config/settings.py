
from pathlib import Path
import os
import re

BASE_DIR = Path(__file__).resolve().parent.parent

def env(key, default=None):
    return os.environ.get(key, default)

def env_bool(key, default=False):
    val = os.environ.get(key)
    if val is None:
        return default
    return str(val).strip().lower() in {"1","true","yes","on"}

def env_list(key, default=None):
    val = os.environ.get(key)
    if not val:
        return default or []
    # split by comma or whitespace; strip each
    parts = re.split(r'[,\s]+', val.strip())
    return [p for p in (s.strip() for s in parts) if p]

def ensure_https_origins(items):
    out = []
    for item in items:
        if not item:
            continue
        if item.startswith("http://") or item.startswith("https://"):
            out.append(item)
        else:
            out.append("https://" + item.lstrip("."))
    return out

SECRET_KEY = env("DJANGO_SECRET_KEY", "change-me-unsafe")

DEBUG = env_bool("DEBUG", env_bool("DJANGO_DEBUG", False))

# Hosts
_allowed_hosts = env_list("ALLOWED_HOSTS", [])
if not _allowed_hosts:
    _allowed_hosts = [".onrender.com", ".vsemnauka.ru", "localhost", "127.0.0.1"]
ALLOWED_HOSTS = _allowed_hosts

# CSRF trusted origins
_csrf_env = env_list("CSRF_TRUSTED_ORIGINS", [])
if not _csrf_env:
    # derive from ALLOWED_HOSTS if not explicitly provided
    _csrf_env = ensure_https_origins([h.lstrip(".") for h in _allowed_hosts if h and h != "*"])
# Always include render subdomain origin
_csrf_env.append("https://*.onrender.com")
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_csrf_env))  # dedupe, keep order

# Security & proxy
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24  # 1 day; increase after verifying
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"

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

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Optional host debug middleware (enabled by ENV ENABLE_HOST_DEBUG=1)
if env_bool("ENABLE_HOST_DEBUG", False):
    MIDDLEWARE.insert(0, "config.host_debug_middleware.HostDebugMiddleware")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_NAME": "django.contrib.admin",
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

WSGI_APPLICATION = "config.wsgi.application"

# Database
# Use dj-database-url if available
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
_db_url = os.environ.get("DATABASE_URL")
if _db_url:
    try:
        import dj_database_url
        DATABASES["default"] = dj_database_url.config(default=_db_url, conn_max_age=600, ssl_require=True)
    except Exception:
        pass

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [p for p in [BASE_DIR / "static"] if p.exists()]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Health check toggle path (handled in urls)
HEALTHZ_PATH = "/healthz"

APPEND_SLASH = True
