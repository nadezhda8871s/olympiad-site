
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
# Важно: правильный импорт set_language (иначе ImportError и 502)
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
    # для {% url 'set_language' %} из шаблонов
    path("i18n/setlang/", set_language, name="set_language"),
]

# Подключаем приложения. Если модуль недоступен, не валим весь сайт.
try:
    urlpatterns += [path("", include("pages.urls"))]
except Exception:
    def _home(_request):
        return HttpResponse("home ok", content_type="text/plain")
    urlpatterns.append(path("", _home))

try:
    urlpatterns += [path("", include("events.urls"))]
except Exception:
    # просто пропускаем events, чтобы сайт не падал при импорте
    pass
