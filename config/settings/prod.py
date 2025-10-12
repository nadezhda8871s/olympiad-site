from .base import *  # noqa
import os

DEBUG = False

# Read hosts and CSRF origins from environment (Render -> Environment)
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

# Security / proxy headers (Render runs behind a proxy)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Allow toggling redirect via ENV if needed
SECURE_SSL_REDIRECT = str(os.getenv("SECURE_SSL_REDIRECT", "1")).lower() in {"1","true","yes","on"}

# Static files via WhiteNoise
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
