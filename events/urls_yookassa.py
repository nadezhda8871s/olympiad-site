from django.urls import path
from . import yookassa_views as views

urlpatterns = [
    path("success/", views.pay_success, name="yookassa_success"),
    path("form/<int:reg_id>/", views.yookassa_payment_form, name="yookassa_payment_form"),
    path("webhook/", views.yookassa_webhook, name="yookassa_webhook"),
]
