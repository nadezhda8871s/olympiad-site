
from django.http import HttpResponse

class HostDebugMiddleware:
    """
    Put first in MIDDLEWARE to quickly inspect Host/headers when 400s happen.
    Enable via ENV: ENABLE_HOST_DEBUG=1
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Uncomment to see all requests (can be noisy):
        # print("Host:", request.get_host(), "| META[HTTP_HOST]:", request.META.get("HTTP_HOST"),
        #       "| X-Forwarded-Proto:", request.META.get("HTTP_X_FORWARDED_PROTO"),
        #       "| X-Forwarded-Host:", request.META.get("HTTP_X_FORWARDED_HOST"))
        return self.get_response(request)
