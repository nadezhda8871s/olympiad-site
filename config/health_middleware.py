
from django.http import HttpResponse

class HealthCheckMiddleware:
    """Lightweight middleware to answer Render health checks at /healthz."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/healthz":
            return HttpResponse("ok", content_type="text/plain", status=200)
        return self.get_response(request)
