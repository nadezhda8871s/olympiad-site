
import json
from django.http import JsonResponse

class HostDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    @staticmethod
    def view(request):
        data = {
            "META": {k: v for k, v in request.META.items() if k.startswith(("HTTP_", "REMOTE_", "SERVER_", "wsgi"))},
            "host": request.get_host(),
            "scheme": request.scheme,
            "is_secure": request.is_secure(),
        }
        return JsonResponse(data)
