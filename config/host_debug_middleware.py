import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class HostHeaderDebugMiddleware(MiddlewareMixin):
    def process_request(self, request):
        host = request.META.get("HTTP_HOST")
        xfh = request.META.get("HTTP_X_FORWARDED_HOST")
        xfp = request.META.get("HTTP_X_FORWARDED_PROTO")
        logger.warning("DEBUG Host check — HTTP_HOST=%r X-Forwarded-Host=%r X-Forwarded-Proto=%r", host, xfh, xfp)
        return None
