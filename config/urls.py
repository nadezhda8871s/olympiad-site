from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from django.conf.urls.i18n import set_language

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

def favicon(_request):
    # Пустая "иконка", чтобы браузеры не сыпали 404
    return HttpResponse(b"", content_type="image/x-icon", status=200)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("favicon.ico", favicon),
    # i18n: для {% url 'set_language' %} из base.html
    path("i18n/setlang/", set_language, name="set_language"),
    # Основные приложения
    path("", include("pages.urls")),   # главная и "О нас"
    path("", include("events.urls")),  # разделы мероприятий
]
