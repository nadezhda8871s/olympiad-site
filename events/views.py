import logging
from decimal import Decimal
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from django.conf import settings
from .models import Event, Registration
from .forms import RegistrationForm
from .services.yookassa import YooKassaService

logger = logging.getLogger(__name__)


def event_list(request):
    """Display list of all events"""
    try:
        events = Event.objects.filter(is_active=True).order_by('-start_date')
        context = {'events': events, 'title': 'Мероприятия'}
        return render(request, 'events/list.html', context)
    except Exception as e:
        logger.error(f'Error loading event list: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке мероприятий')
        return render(request, 'events/list.html', {'events': []})


def event_detail(request, pk):
    """Display event details"""
    try:
        event = get_object_or_404(Event, pk=pk, is_active=True)
        context = {'event': event, 'title': event.title}
        return render(request, 'events/detail.html', context)
    except Event.DoesNotExist:
        messages.error(request, 'Мероприятие не найдено')
        return redirect('events:list')
    except Exception as e:
        logger.error(f'Error loading event {pk}: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке мероприятия')
        return redirect('events:list')


@require_http_methods(['GET', 'POST'])
def event_register(request, pk):
    """Register for event"""
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

                # 🔹 После сохранения — переходим на страницу с формой SimplePay
                return redirect('yookassa_payment_form', reg_id=registration.id)

            else:
                messages.error(request, 'Пожалуйста, исправьте ошибки в форме')
        else:
            form = RegistrationForm()

        context = {
            'form': form,
            'event': event,
            'title': f'Регистрация на {event.title}'
        }
        return render(request, 'events/register.html', context)

    except Event.DoesNotExist:
        messages.error(request, 'Мероприятие не найдено')
        return redirect('events:list')
    except Exception as e:
        logger.error(f'Error registering for event {pk}: {str(e)}')
        messages.error(request, 'Произошла ошибка при регистрации')
        return redirect('events:detail', pk=pk)


@require_http_methods(['GET'])
def payment_result(request):
    """Handle payment result"""
    try:
        payment_id = request.GET.get('payment_id')

        if not payment_id:
            messages.error(request, 'Неверные параметры платежа')
            return redirect('events:list')

        payment_data = YooKassaService.get_payment(payment_id)

        if not payment_data:
            messages.error(request, 'Ошибка проверки платежа')
            return redirect('events:list')

        try:
            registration = Registration.objects.get(payment_id=payment_id)

            if payment_data['status'] == 'succeeded':
                registration.payment_status = 'completed'
                registration.save()
                messages.success(request, 'Оплата прошла успешно! Вы зарегистрированы на мероприятие.')
            elif payment_data['status'] == 'canceled':
                registration.payment_status = 'failed'
                registration.save()
                messages.warning(request, 'Платеж отменен')
            else:
                registration.payment_status = 'pending'
                registration.save()
                messages.info(request, 'Платеж в обработке')

            return redirect('events:detail', pk=registration.event.pk)

        except Registration.DoesNotExist:
            logger.error(f'Registration not found for payment {payment_id}')
            messages.error(request, 'Регистрация не найдена')
            return redirect('events:list')

    except Exception as e:
        logger.error(f'Error processing payment result: {str(e)}')
        messages.error(request, 'Произошла ошибка при обработке платежа')
        return redirect('events:list')


def olympiads_list(request):
    """Display list of olympiads"""
    try:
        events = Event.objects.filter(
            event_type='olympiad',
            is_active=True
        ).order_by('-start_date')
        context = {'events': events, 'title': 'Олимпиады'}
        return render(request, 'events/olympiads_list.html', context)
    except Exception as e:
        logger.error(f'Error loading olympiads: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке олимпиад')
        return render(request, 'events/olympiads_list.html', {'events': []})


def contests_list(request):
    """Display list of contests"""
    try:
        events = Event.objects.filter(
            event_type='contest',
            is_active=True
        ).order_by('-start_date')
        context = {'events': events, 'title': 'Конкурсы'}
        return render(request, 'events/contests_list.html', context)
    except Exception as e:
        logger.error(f'Error loading contests: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке конкурсов')
        return render(request, 'events/contests_list.html', {'events': []})


def conferences_list(request):
    """Display list of conferences"""
    try:
        events = Event.objects.filter(
            event_type='conference',
            is_active=True
        ).order_by('-start_date')
        context = {'events': events, 'title': 'Конференции'}
        return render(request, 'events/conferences_list.html', context)
    except Exception as e:
        logger.error(f'Error loading conferences: {str(e)}')
        messages.error(request, 'Произошла ошибка при загрузке конференций')
        return render(request, 'events/conferences_list.html', {'events': []})
