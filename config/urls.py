from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # === YooKassa ===
    # Вебхук от ЮКассы (сюда приходят уведомления о статусе платежа)
    path(
        'pay/success/',
        __import__('events.yookassa_views', fromlist=['']).yookassa_webhook,
        name='yookassa_webhook'
    ),
    # Остальные маршруты ЮКассы: форма оплаты, success-страница и т.д.
    path('pay/', include('events.urls_yookassa')),

    # === Админка и основные приложения ===
    path('admin/', admin.site.urls),
    path('events/', include('events.urls')),
    path('pages/', include('pages.urls')),
    path('', include('pages.urls')),  # Главная страница

    # === Дополнительно ===
    # Исправляет ошибку set_language (переключение языка)
    path('i18n/', include('django.conf.urls.i18n')),
]

# === Поддержка статики и медиа ===
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
