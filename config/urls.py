from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

def favicon(_request):
    # Пустая "иконка", чтобы браузеры не сыпали 404
    return HttpResponse(b"", content_type="image/x-icon", status=200)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("favicon.ico", favicon),
    path("", include("pages.urls")),   # главная и "О нас"
    path("", include("events.urls")),  # разделы мероприятий
]
