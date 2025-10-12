from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("events.urls")),                 # главные разделы
    path("", include("pages.urls")),                  # /about/
    path("i18n/", include("django.conf.urls.i18n")),  # /i18n/setlang/
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
