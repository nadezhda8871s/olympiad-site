import logging
from decimal import Decimal
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from django.conf import settings
from django.db import models
from .models import Event, Registration
from .forms import RegistrationForm
from .services.yookassa import YooKassaService

logger = logging.getLogger(__name__)


def event_list(request):
    """Отображает список всех активных мероприятий"""
    try:
        events = Event.objects.filter(is_active=True).order_by('-start_date')
        return render(request, 'events/list.html', {'events': events, 'title': 'Мероприятия'})
    except Exception as e:
        logger.error(f'Ошибка загрузки списка мероприятий: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке мероприятий')
        return render(request, 'events/list.html', {'events': []})


def event_detail(request, pk):
    """Детальная страница мероприятия"""
    try:
        event = get_object_or_404(Event, pk=pk, is_active=True)
        return render(request, 'events/detail.html', {'event': event, 'title': event.title})
    except Event.DoesNotExist:
        messages.error(request, 'Мероприятие не найдено')
        return redirect('events:list')
    except Exception as e:
        logger.error(f'Ошибка загрузки мероприятия {pk}: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке мероприятия')
        return redirect('events:list')


@require_http_methods(['GET', 'POST'])
def event_register(request, pk):
    """Регистрация на мероприятие"""
    try:
        event = get_object_or_404(Event, pk=pk, is_active=True)
        
        if request.method == 'POST':
            form = RegistrationForm(request.POST)
            if form.is_valid():
                registration = form.save(commit=False)
                registration.event = event
                if request.user.is_authenticated:
                    registration.user = request.user
                registration.save()

                # Платёж через YooKassa
                if event.fee and event.fee > 0:
                    return_url = request.build_absolute_uri(reverse('events:payment_result'))
                    payment_data = YooKassaService.create_payment(
                        amount=event.fee,
                        description=f'Регистрация на {event.title}',
                        return_url=return_url,
                        metadata={'registration_id': registration.id, 'event_id': event.id}
                    )
                    if payment_data:
                        registration.payment_id = payment_data['id']
                        registration.payment_status = 'pending'
                        registration.save()
                        return redirect(payment_data['confirmation_url'])
                    else:
                        messages.error(request, 'Ошибка создания платежа. Попробуйте позже.')
                        registration.delete()
                        return redirect('events:detail', pk=event.pk)
                else:
                    registration.payment_status = 'completed'
                    registration.save()
                    messages.success(request, 'Вы успешно зарегистрированы!')
                    return redirect('events:detail', pk=event.pk)
            else:
                messages.error(request, 'Пожалуйста, исправьте ошибки в форме')
        else:
            form = RegistrationForm()

        return render(request, 'events/register.html', {
            'form': form,
            'event': event,
            'title': f'Регистрация на {event.title}'
        })

    except Exception as e:
        logger.error(f'Ошибка регистрации на мероприятие {pk}: {str(e)}')
        messages.error(request, 'Произошла ошибка при регистрации')
        return redirect('events:detail', pk=pk)


@require_http_methods(['GET'])
def payment_result(request):
    """Обработка результата платежа"""
    try:
        payment_id = request.GET.get('payment_id')
        if not payment_id:
            messages.error(request, 'Неверные параметры платежа')
            return redirect('events:list')

        payment_data = YooKassaService.get_payment(payment_id)
        if not payment_data:
            messages.error(request, 'Ошибка проверки платежа')
            return redirect('events:list')

        registration = Registration.objects.get(payment_id=payment_id)
        status = payment_data.get('status')

        if status == 'succeeded':
            registration.payment_status = 'completed'
            registration.save()
            messages.success(request, 'Оплата прошла успешно! Вы зарегистрированы.')
        elif status == 'canceled':
            registration.payment_status = 'failed'
            registration.save()
            messages.warning(request, 'Платёж отменён.')
        else:
            registration.payment_status = 'pending'
            registration.save()
            messages.info(request, 'Платёж обрабатывается.')

        return redirect('events:detail', pk=registration.event.pk)

    except Registration.DoesNotExist:
        messages.error(request, 'Регистрация не найдена.')
        return redirect('events:list')
    except Exception as e:
        logger.error(f'Ошибка обработки платежа: {str(e)}')
        messages.error(request, 'Произошла ошибка при обработке платежа.')
        return redirect('events:list')


def olympiads_list(request):
    """Показывает все активные олимпиады"""
    try:
        events = Event.objects.filter(is_active=True).filter(
            models.Q(event_type__iexact='olympiad') |
            models.Q(title__icontains='олимпиад')
        ).order_by('-start_date')
        return render(request, 'events/olympiads_list.html', {'events': events, 'title': 'Олимпиады'})
    except Exception as e:
        logger.error(f'Ошибка загрузки олимпиад: {str(e)}')
        return render(request, 'events/olympiads_list.html', {'events': []})


def contests_list(request):
    """Показывает все активные конкурсы"""
    try:
        events = Event.objects.filter(is_active=True).filter(
            models.Q(event_type__iexact='contest') |
            models.Q(title__icontains='конкурс')
        ).order_by('-start_date')
        return render(request, 'events/contests_list.html', {'events': events, 'title': 'Конкурсы'})
    except Exception as e:
        logger.error(f'Ошибка загрузки конкурсов: {str(e)}')
        return render(request, 'events/contests_list.html', {'events': []})


def conferences_list(request):
    """Показывает все активные конференции"""
    try:
        events = Event.objects.filter(is_active=True).filter(
            models.Q(event_type__iexact='conference') |
            models.Q(title__icontains='конференц')
        ).order_by('-start_date')
        return render(request, 'events/conferences_list.html', {'events': events, 'title': 'Конференции'})
    except Exception as e:
        logger.error(f'Ошибка загрузки конференций: {str(e)}')
        return render(request, 'events/conferences_list.html', {'events': []})
