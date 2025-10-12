import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# --- helpers ---
def split_csv(value: str):
    if not value:
        return []
    # допускаем пробелы/точки с запятой
    parts = [p.strip() for p in value.replace(";", ",").split(",")]
    return [p for p in parts if p]

def env_first(*names, default=None):
    for n in names:
        v = os.getenv(n)
        if v not in (None, ""):
            return v
    return default

# --- core ---
SECRET_KEY = env_first("SECRET_KEY", "DJANGO_SECRET_KEY", default="change-me")
DEBUG = env_first("DEBUG", "DJANGO_DEBUG", default="0") in ("1","true","True","yes","on")

# ALLOWED_HOSTS
raw_hosts = env_first("ALLOWED_HOSTS", "DJANGO_ALLOWED_HOSTS", default="")
ALLOWED_HOSTS = split_csv(raw_hosts)

# Разрешаем '*' для быстрой диагностики (можно убрать после запуска)
if len(ALLOWED_HOSTS) == 1 and ALLOWED_HOSTS[0] == "*":
    ALLOWED_HOSTS = ["*"]

# Базовые безопасные дефолты (если env не задан)
if not ALLOWED_HOSTS or ALLOWED_HOSTS == [""]:
    ALLOWED_HOSTS = [
        "localhost", "127.0.0.1",
        "olympiad-site-1.onrender.com",
        "www.vsemnauka.ru", "vsemnauka.ru",
        ".vsemnauka.ru",
    ]

# Render внешнее имя (подхватываем автоматически)
render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

# CSRF доверенные источники (полные URL)
raw_csrf = env_first("CSRF_TRUSTED_ORIGINS", "DJANGO_CSRF_TRUSTED_ORIGINS", default="")
CSRF_TRUSTED_ORIGINS = split_csv(raw_csrf)
if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        "https://olympiad-site-1.onrender.com",
        "https://www.vsemnauka.ru",
        "https://vsemnauka.ru",
    ]

# За прокси: доверяем хедеру протокола и хосту
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# --- apps ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "events",
    "pages",
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

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

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

# DB: Render -> DATABASE_URL; локально sqlite
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
if (BASE_DIR / "static").exists():
    STATICFILES_DIRS = [BASE_DIR / "static"]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

if not DEBUG:
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    # HSTS можно включить после подтверждения корректной работы:
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # SECURE_HSTS_PRELOAD = True
