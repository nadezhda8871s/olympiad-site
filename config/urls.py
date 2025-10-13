from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
# Важно: правильный импорт set_language
from django.views.i18n import set_language

def healthz(_request):
    return HttpResponse("ok", content_type="text/plain")

def favicon(_request):
    # Пустая иконка, чтобы браузеры не сыпали 404
    return HttpResponse(b"", content_type="image/x-icon", status=200)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("favicon.ico", favicon),
    # Для {% url 'set_language' %} из templates/base.html
    path("i18n/setlang/", set_language, name="set_language"),
    # Ваши приложения
    path("", include("pages.urls")),   # главная, о нас и пр.
    path("", include("events.urls")),  # олимпиады/конкурсы/конференции
]
