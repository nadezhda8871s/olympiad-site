from django.urls import path
from . import views

app_name = "events"

urlpatterns = [
    path("", views.event_list, name="list"),
    path("olympiads/", views.events_list_olymps, name="olympiads"),
    path("contests/", views.events_list_contests, name="contests"),
    path("conferences/", views.events_list_conferences, name="conferences"),
    path("events/<slug:slug>/", views.event_detail, name="detail"),
    path("events/<slug:slug>/register/", views.event_register, name="register"),
    path("events/<slug:slug>/download/", views.event_info_download, name="event_info_download"),
    # other existing routes (payment_mock, test_view, etc.) remain in views and in project's urls configuration
]
