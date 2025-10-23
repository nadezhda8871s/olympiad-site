from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Development-specific settings
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Use console email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable caching in development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}
