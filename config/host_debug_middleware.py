from django.core.exceptions import DisallowedHost
from django.http import HttpResponse

class HostDebugMiddleware:
    """
    Включайте через ENABLE_HOST_DEBUG=1.
    Перехватывает DisallowedHost и возвращает диагностическую страницу вместо "немого" 400.
    Полезно на время настройки доменов/прокси.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except DisallowedHost:
            details = [
                "DisallowedHost (диагностика включена ENABLE_HOST_DEBUG=1)",
                f"Host: {request.META.get('HTTP_HOST')}",
                f"get_host(): {request.get_host()}",
                f"X-Forwarded-Host: {request.META.get('HTTP_X_FORWARDED_HOST')}",
                f"X-Forwarded-Proto: {request.META.get('HTTP_X_FORWARDED_PROTO')}",
                f"Server name: {request.META.get('SERVER_NAME')}",
            ]
            return HttpResponse("\n".join(details), status=400, content_type="text/plain")
