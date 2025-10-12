from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),  # для Render Health Check
    path("", include("events.urls")),   # ваша главная
    path("", include("pages.urls")),    # если у вас есть pages
]
