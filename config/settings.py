import os
from pathlib import Path
from dotenv import load_dotenv

# --- Base ---
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-prod")
DEBUG = os.getenv("DEBUG", "0") in ("1", "true", "True", "yes", "on")

# --- Hosts / CSRF ---
def _split_csv(env_name, default_list=None):
    raw = os.getenv(env_name, "")
    if not raw and default_list is not None:
        return default_list
    return [x.strip() for x in raw.split(",") if x.strip()]

# Базовый список хостов (на случай, если переменные окружения не заданы)
_default_hosts = [
    "localhost", "127.0.0.1",
    "olympiad-site-1.onrender.com",
    "www.vsemnauka.ru", "vsemnauka.ru",
]
ALLOWED_HOSTS = _split_csv("ALLOWED_HOSTS", _default_hosts)

# Render публикует внешний хост в переменной окружения
_render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)

# CSRF: обязательно указывать полные URL с протоколом
_default_csrf = [
    "https://olympiad-site-1.onrender.com",
    "https://www.vsemnauka.ru",
    "https://vsemnauka.ru",
]
CSRF_TRUSTED_ORIGINS = _split_csv("CSRF_TRUSTED_ORIGINS", _default_csrf)

# Proxy SSL (важно для корректного HTTPS за балансировщиком Render)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# --- Apps ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # ваши приложения:
    "events",
    "pages",
]

# --- Middleware (WhiteNoise для статики) ---
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

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

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

# --- Database ---
# Render/Prod: DATABASE_URL задаётся в Environments. Локально можно оставить sqlite.
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    import dj_database_url
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# --- Password validation ---
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n ---
LANGUAGE_CODE = "ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

# --- Static files ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
# WhiteNoise: сжатие и манифест
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- Media (если используется) ---
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- Security hardening (можно ослабить при локальной отладке) ---
if not DEBUG:
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", "0") in ("1","true","True","yes","on")
    SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "0") in ("1","true","True","yes","on")
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
