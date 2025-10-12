
import os
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class HostHeaderDebugMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if os.getenv("ENABLE_HOST_DEBUG") == "1":
            logger.warning(
                "DEBUG Host check: Host=%s, get_host()=%s, "
                "X-Forwarded-Host=%s, X-Forwarded-Proto=%s",
                request.META.get("HTTP_HOST"),
                request.get_host(),
                request.META.get("HTTP_X_FORWARDED_HOST"),
                request.META.get("HTTP_X_FORWARDED_PROTO"),
            )
        return None
