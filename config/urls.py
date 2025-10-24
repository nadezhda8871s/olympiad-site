from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from events import views as event_views

urlpatterns = [
    # === YooKassa ===
    path(
        'pay/success/',
        __import__('events.yookassa_views', fromlist=['']).yookassa_webhook,
        name='yookassa_webhook'
    ),
    path('pay/', include('events.urls_yookassa')),

    # === Админка и основные приложения ===
    path('admin/', admin.site.urls),
    path('events/', include('events.urls')),
    path('pages/', include('pages.urls')),
    path('', include('pages.urls')),

    # === Короткие адреса для категорий мероприятий ===
    path('olympiads/', event_views.olympiads_list, name='olympiads_list'),
    path('contests/', event_views.contests_list, name='contests_list'),
    path('conferences/', event_views.conferences_list, name='conferences_list'),

    # === Локализация ===
    path('i18n/', include('django.conf.urls.i18n')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
