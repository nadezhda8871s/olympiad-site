import os
from pathlib import Path
from dotenv import load_dotenv  # ✅ добавляем поддержку .env

# --- Load environment variables from .env ---
load_dotenv()

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Core ---
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-secret-key-for-dev")
DEBUG = str(os.environ.get("DEBUG", os.environ.get("DJANGO_DEBUG", "0"))).lower() in {"1", "true", "yes", "on"}

def _split_env_list(val):
    if not val:
        return []
    return [x.strip() for x in str(val).replace(";", ",").split(",") if x.strip()]

# --- Allowed hosts ---
ALLOWED_HOSTS = _split_env_list(os.environ.get("ALLOWED_HOSTS")) or [
    "localhost", "127.0.0.1", ".onrender.com", ".vsemnauka.ru"
]

# --- CSRF trusted origins ---
_csrf = _split_env_list(os.environ.get("CSRF_TRUSTED_ORIGINS"))
_default_csrf = [
    "https://localhost",
    "https://127.0.0.1",
    "https://*.onrender.com",
    "https://www.vsemnauka.ru",
    "https://vsemnauka.ru"
]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_csrf or _default_csrf))

# --- Proxy & SSL ---
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = str(os.environ.get("SECURE_SSL_REDIRECT", "1")).lower() in {"1", "true", "yes", "on"}

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 0  # Можно включить позже (например 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# --- Installed apps ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # ✅ Добавь сюда свои приложения:
    # "events",
    # "users",
    # "payments",
]

# --- Middleware ---
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

# --- Host debug middleware (опционально) ---
if str(os.environ.get("ENABLE_HOST_DEBUG", "0")).lower() in {"1", "true", "yes", "on"}:
    MIDDLEWARE.insert(0, "config.host_debug_middleware.HostDebugMiddleware")

# --- URLs / WSGI ---
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# --- Database ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# --- Templates ---
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

# --- Static files (WhiteNoise) ---
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")] if os.path.isdir(os.path.join(BASE_DIR, "static")) else []
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- Media files ---
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# --- Default primary key ---
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- YooKassa settings (из .env) ---
YOOKASSA_SHOP_ID = os.environ.get("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.environ.get("YOOKASSA_SECRET_KEY")
