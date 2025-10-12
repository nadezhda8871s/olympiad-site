
# Lightweight health check middleware so you don't have to modify urls.py
from django.http import HttpResponse

class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/healthz" or request.path == "/healthz/":
            return HttpResponse("ok", content_type="text/plain", status=200)
        return self.get_response(request)
