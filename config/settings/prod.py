from .base import *  # noqa
import os

DEBUG = False

# Читаем хосты и CSRF-ориджины из переменных окружения (Render → Environment)
# Пример (Render):
#   ALLOWED_HOSTS=www.vsemnauka.ru,vsemnauka.ru,olympiad-site-1.onrender.com
#   CSRF_TRUSTED_ORIGINS=https://www.vsemnauka.ru,https://vsemnauka.ru,https://olympiad-site-1.onrender.com,https://*.onrender.com
ALLOWED_HOSTS = [
    h.strip() for h in os.getenv(
        "ALLOWED_HOSTS", ".onrender.com,localhost,127.0.0.1"
    ).split(",") if h.strip()
]

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv(
        "CSRF_TRUSTED_ORIGINS", "https://*.onrender.com"
    ).split(",") if o.strip()
]

# Безопасность / прокси (Render идёт через прокси)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Редирект на HTTPS можно переключать через ENV при необходимости
SECURE_SSL_REDIRECT = str(os.getenv("SECURE_SSL_REDIRECT", "1")).lower() in {"1","true","yes","on"}

# Статика через WhiteNoise
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
