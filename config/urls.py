from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from django.views.i18n import set_language
from django.conf import settings
from django.conf.urls.static import static
def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

def favicon(_request):
    return HttpResponse(b"", content_type="image/x-icon", status=200)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("favicon.ico", favicon),
    path("i18n/setlang/", set_language, name="set_language"),
    path("", include("pages.urls")),
    path("", include("events.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
