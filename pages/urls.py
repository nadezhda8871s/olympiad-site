from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def healthz(request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("", include("pages.urls")),
    path("", include("events.urls")),
]
