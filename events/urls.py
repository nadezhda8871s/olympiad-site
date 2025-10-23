from django.urls import path
from . import views

app_name = 'events'

urlpatterns = [
    path('', views.event_list, name='list'),
    path('<int:pk>/', views.event_detail, name='detail'),
    path('<int:pk>/register/', views.event_register, name='register'),
    path('payment/result/', views.payment_result, name='payment_result'),
    path('olympiads/', views.olympiads_list, name='olympiads'),
    path('contests/', views.contests_list, name='contests'),
    path('conferences/', views.conferences_list, name='conferences'),
]
