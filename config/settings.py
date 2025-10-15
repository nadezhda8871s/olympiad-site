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

# --- Media (uploads) ---
# URL under which uploaded media files are served
MEDIA_URL = os.environ.get("MEDIA_URL", "/media/")

# Filesystem path where media files are stored when not using external storage
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", os.path.join(BASE_DIR, "media"))

# Optional: use S3-compatible storage when USE_S3 env var is truthy.
USE_S3 = str(os.environ.get("USE_S3", "0")).lower() in {"1", "true", "yes", "on"}

if USE_S3:
    # Ensure storages app is present — if you enable USE_S3 also install django-storages[boto3]
    if "storages" not in INSTALLED_APPS:
        INSTALLED_APPS.append("storages")

    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

    # Required AWS settings (set as env vars in production)
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "")
    # Optional: custom domain or endpoint for S3-like providers
    AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL")
    if AWS_S3_ENDPOINT_URL:
        AWS_S3_CUSTOM_DOMAIN = AWS_S3_ENDPOINT_URL
    # Set MEDIA_URL for S3 if provided explicitly
    MEDIA_URL = os.environ.get("MEDIA_URL", MEDIA_URL)
else:
    # Default filesystem storage (Django default). Explicitly set to FileSystemStorage.
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
