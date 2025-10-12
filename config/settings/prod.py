import os
from .base import *  # noqa

DEBUG = False

# Читаем из переменных окружения, чтобы не ломать кастомные домены
ALLOWED_HOSTS = [h.strip() for h in os.getenv(
    "ALLOWED_HOSTS", ".onrender.com,localhost,127.0.0.1"
).split(",") if h.strip()]

CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.getenv(
    "CSRF_TRUSTED_ORIGINS", "https://*.onrender.com"
).split(",") if o.strip()]

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Разрешаем управлять редиректом только через ENV (Render: SECURE_SSL_REDIRECT=1)
SECURE_SSL_REDIRECT = str(os.getenv("SECURE_SSL_REDIRECT", "1")).lower() in {"1", "true", "yes", "on"}

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
