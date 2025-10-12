from django.http import HttpResponseBadRequest

class HostDebugMiddleware:
    """
    Helps diagnose 400 Bad Request due to invalid Host / CSRF origin.
    Inserted first when ENABLE_HOST_DEBUG=1.
    Does nothing unless request would be rejected later.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as e:
            # Only wrap Bad Request plain errors
            if isinstance(e, Exception) and "Bad Request" in str(e):
                details = [
                    "HostDebugMiddleware caught Bad Request",
                    f"Host: {request.META.get('HTTP_HOST')}",
                    f"X-Forwarded-Proto: {request.META.get('HTTP_X_FORWARDED_PROTO')}",
                    f"X-Forwarded-For: {request.META.get('HTTP_X_FORWARDED_FOR')}",
                    f"Scheme seen by Django: {request.scheme}",
                ]
                return HttpResponseBadRequest("\n".join(details), content_type="text/plain")
            raise
