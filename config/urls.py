from django.contrib import admin
from django.http import HttpResponse
from django.urls import path

# НИКАКИХ include самого себя — это вызывало рекурсию.

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

def favicon(_request):
    return HttpResponse(b"", content_type="image/x-icon")


def index(_request):
    # Временная «домашняя» заглушка, чтобы не получать 500/400 на /
    return HttpResponse("home ok", content_type="text/plain")

urlpatterns = [
    path("favicon.ico", favicon),
    path("", index),            # корень — отдаёт 200
    path("healthz", healthz),   # для Render Health Checks
    path("admin/", admin.site.urls),
]

# Если у вас есть приложение с реальной главной страницей:
# from django.urls import include
# urlpatterns[0] = path("", include("main.urls"))
