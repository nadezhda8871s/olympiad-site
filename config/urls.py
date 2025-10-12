from django.contrib import admin
from django.http import HttpResponse
from django.urls import path

# ВАЖНО: никаких include самого себя — это и вызывало рекурсию в резолвере.

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),  # для Render Health Checks
]

# Если у вас есть приложение с роутами главной страницы (например, app "main"),
# подключите его ТОЛЬКО здесь, без самоподключений:
# from django.urls import include
# urlpatterns += [path("", include("main.urls"))]
