import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Core ---
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-secret-key-for-dev")
DEBUG = str(os.environ.get("DEBUG", os.environ.get("DJANGO_DEBUG", "0"))).lower() in {"1","true","yes","on"}

def _split_env_list(val):
    if not val:
        return []
    return [x.strip() for x in str(val).replace(";", ",").split(",") if x.strip()]

# Allowed hosts
ALLOWED_HOSTS = _split_env_list(os.environ.get("ALLOWED_HOSTS")) or [
    "localhost", "127.0.0.1", ".onrender.com", ".vsemnauka.ru"
]

# CSRF trusted origins
_csrf = _split_env_list(os.environ.get("CSRF_TRUSTED_ORIGINS"))
_default_csrf = ["https://localhost", "https://127.0.0.1", "https://*.onrender.com", "https://www.vsemnauka.ru", "https://vsemnauka.ru"]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_csrf or _default_csrf))

# Proper behavior behind Render proxy
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = str(os.environ.get("SECURE_SSL_REDIRECT", "1")).lower() in {"1","true","yes","on"}

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 0  # set >0 later if you want HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Apps (minimal; keep existing apps in your project additively)
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

# Middleware
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

# Optional debug of 400 host issues
if str(os.environ.get("ENABLE_HOST_DEBUG", "0")).lower() in {"1","true","yes","on"}:
    MIDDLEWARE.insert(0, "config.host_debug_middleware.HostDebugMiddleware")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Database (leave your existing DATABASES if present)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Templates (works with your current templates directory)
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

# Static files via WhiteNoise
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")] if os.path.isdir(os.path.join(BASE_DIR, "static")) else []
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Media settings
MEDIA_URL = "/media/"
import os as _os
BASE_DIR = BASE_DIR if 'BASE_DIR' in globals() else _os.path.dirname(_os.path.dirname(__file__))
MEDIA_ROOT = _os.path.join(BASE_DIR, "media")


# --- YooKassa configuration ---
YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
YOOKASSA_SUCCESS_PATH = os.getenv("YOOKASSA_SUCCESS_PATH", "/pay/success/")
YOOKASSA_WEBHOOK_PATH = os.getenv("YOOKASSA_WEBHOOK_PATH", "/pay/webhook/")
