
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz, name="healthz"),
]

# Include app URLs if they exist (prevents circular imports)
try:
    urlpatterns += [path("", include("pages.urls"))]
except Exception:
    pass

try:
    urlpatterns += [path("", include("events.urls"))]
except Exception:
    pass
