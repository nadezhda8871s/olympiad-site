# config/urls.py
from django.contrib import admin
from django.urls import path, include

# Важно для раздачи медиа-файлов (Информационные письма)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Страницы сайта
    path("", include("pages.urls")),

    # Мероприятия (олимпиады/конкурсы/конференции)
    path("", include("events.urls")),
]

# Раздача MEDIA: нужна, чтобы скачивались файлы Информационных писем
# Работает и при DEBUG=False (для небольших проектов допустимо).
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
