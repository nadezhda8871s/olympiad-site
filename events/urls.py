# events/urls.py
from django.urls import path
from . import views

app_name = "events"

urlpatterns = [
    # Списки мероприятий
    path("olympiads/", views.events_list_olymps, name="olympiads"),
    path("contests/", views.events_list_contests, name="contests"),
    path("conferences/", views.events_list_conferences, name="conferences"),

    # Детальная и регистрация
    path("event/<slug:slug>/", views.event_detail, name="event_detail"),
    path("register/<slug:slug>/", views.event_register, name="event_register"),

    # Оплата ЮKassa
    path("pay/<int:reg_id>/", views.payment_start, name="payment_start"),
    path("pay/success/", views.payment_success, name="payment_success"),
    path("pay/webhook/", views.payment_webhook, name="payment_webhook"),  # НЕ обязателен
]
