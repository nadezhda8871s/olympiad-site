from django.urls import path
from . import views

app_name = "events_yookassa"

urlpatterns = [
    path("notify/", views.yookassa_webhook, name="yookassa_webhook"),
    path("start/<int:reg_id>/", views.start_payment_yookassa, name="start_payment_yookassa"),
]