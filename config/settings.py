import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ── DEBUG из переменных окружения (по умолчанию выключен)
def _env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in {"1", "true", "yes", "on"}

DEBUG = _env_bool("DEBUG", False) or _env_bool("DJANGO_DEBUG", False)

# ── SECRET_KEY (не хранить в коде)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me-in-env")

# ── Хосты и доверенные источники CSRF: корректный парсинг списков
def _env_list(name: str) -> list[str]:
    raw = os.getenv(name, "")
    parts = [p.strip() for p in raw.split(",")]
    return [p for p in parts if p]

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    # безопасные дефолты для локальной разработки и Render
    ALLOWED_HOSTS = [".onrender.com", "localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS")

# ── Прокси/HTTPS: обязательные настройки для Render
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", False)

# ── Приложения
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # ваши приложения ниже (не изменял)
    # "main",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # статика на Render
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Включаем диагностическое миддлвар (помогает, если снова словите 400)
if _env_bool("ENABLE_HOST_DEBUG", False):
    MIDDLEWARE.insert(0, "config.host_debug_middleware.HostDebugMiddleware")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# ── База (оставьте, как у вас было; тут — пример sqlite для совместимости)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ── Статика/медиа (WhiteNoise)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── Язык/время (оставьте под себя)
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
