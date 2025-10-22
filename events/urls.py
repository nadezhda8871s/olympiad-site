# events/urls.py
from django.urls import path
from . import views

app_name = "events"

urlpatterns = [
    # списки со слешем
    path("olympiads/", views.events_list_olymps, name="olympiads"),
    path("contests/", views.events_list_contests, name="contests"),
    path("conferences/", views.events_list_conferences, name="conferences"),
    # те же списки без слеша (чтобы боты/внешние ссылки не ловили редирект/500)
    path("olympiads", views.events_list_olymps),
    path("contests", views.events_list_contests),
    path("conferences", views.events_list_conferences),

    # детали/регистрация
    path("event/<slug:slug>/", views.event_detail, name="event_detail"),
    path("register/<slug:slug>/", views.event_register, name="event_register"),

    # оплата YooKassa
    path("pay/<int:reg_id>/", views.payment_start, name="payment_start"),
    path("pay/success/", views.payment_success, name="payment_success"),
    path("pay/webhook/", views.payment_webhook, name="payment_webhook"),  # необязателен
]
