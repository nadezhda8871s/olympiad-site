from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("olympiads/", views.list_olympiads, name="olympiads"),
    path("contests/", views.list_contests, name="contests"),
    path("conferences/", views.list_conferences, name="conferences"),
    path("event/<slug:slug>/", views.event_detail, name="event_detail"),
    path("register/<slug:slug>/", views.register_event, name="register_event"),
    path("pay/<int:order_id>/", views.pay_choice, name="pay_choice"),
    path("pay/<int:order_id>/success/", views.pay_success, name="pay_success"),
    path("pay/<int:order_id>/fail/", views.pay_fail, name="pay_fail"),
    path("test/<int:order_id>/", views.test_start, name="test_start"),
    path("test/<int:order_id>/run/", views.test_run, name="test_run"),
    path("export/csv/", views.export_csv, name="export_csv"),
]
