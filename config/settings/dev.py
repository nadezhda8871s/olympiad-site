from .base import *

DEBUG = True

# ALLOWED_HOSTS = ['*']

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
