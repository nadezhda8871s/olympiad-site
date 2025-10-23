from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('events/', include('events.urls')),
    path('pages/', include('pages.urls')),
    path('', include('pages.urls')),  # Главная страница

    # ✅ Добавлено: маршруты для смены языка (исправляет ошибку set_language)
    path('i18n/', include('django.conf.urls.i18n')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
