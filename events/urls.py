from django.urls import path
from . import views

urlpatterns = [
    path("olympiads/", views.events_list_olymps, name="olympiads"),
    path("contests/", views.events_list_contests, name="contests"),
    path("conferences/", views.events_list_conferences, name="conferences"),
    path("event/<slug:slug>/", views.event_detail, name="event_detail"),
    path("register/<slug:slug>/", views.event_register, name="event_register"),
    path("pay/<int:reg_id>/", views.payment_mock, name="payment_mock"),
    path("test/<int:reg_id>/", views.test_view, name="test_view"),
    path("api/search", views.search_api, name="search_api"),
    path("admin/export/csv/", views.export_csv_view, name="export_csv"),
    path('events/<slug:slug>/download/', views.event_info_download, name='event_info_download'),
]
