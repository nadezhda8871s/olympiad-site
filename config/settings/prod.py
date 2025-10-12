
from .base import *  # noqa
import os

DEBUG = False

# Читаем домены из переменных окружения (Render → Environment)
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", ".onrender.com,localhost,127.0.0.1").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.getenv("CSRF_TRUSTED_ORIGINS", "https://*.onrender.com").split(",") if o.strip()]

# На всякий случай добавляем localhost/127.0.0.1
for _h in ("localhost", "127.0.0.1"):
    if _h not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_h)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = str(os.getenv("SECURE_SSL_REDIRECT", "1")).lower() in {"1","true","yes","on"}

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
