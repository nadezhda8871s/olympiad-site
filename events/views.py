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

                # Payment via YooKassa
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
        logger.error(f'Error processing payment result: {str(e)}')
        messages.error(request, 'Произошла ошибка при обработке платежа.')
        return redirect('events:list')


def olympiads_list(request):
    """List of olympiads"""
    try:
        events = Event.objects.filter(is_active=True, event_type__iexact='olympiad').order_by('-start_date')
        if not events.exists():
            events = Event.objects.filter(is_active=True, title__icontains='олимпиад').order_by('-start_date')
        return render(request, 'events/olympiads_list.html', {'events': events, 'title': 'Олимпиады'})
    except Exception as e:
        logger.error(f'Error loading olympiads: {str(e)}')
        return render(request, 'events/olympiads_list.html', {'events': []})


def contests_list(request):
    """List of contests"""
    try:
        events = Event.objects.filter(is_active=True, event_type__iexact='contest').order_by('-start_date')
        if not events.exists():
            events = Event.objects.filter(is_active=True, title__icontains='конкурс').order_by('-start_date')
        return render(request, 'events/contests_list.html', {'events': events, 'title': 'Конкурсы'})
    except Exception as e:
        logger.error(f'Error loading contests: {str(e)}')
        return render(request, 'events/contests_list.html', {'events': []})


def conferences_list(request):
    """List of conferences"""
    try:
        events = Event.objects.filter(is_active=True, event_type__iexact='conference').order_by('-start_date')
        if not events.exists():
            events = Event.objects.filter(is_active=True, title__icontains='конференц').order_by('-start_date')
        return render(request, 'events/conferences_list.html', {'events': events, 'title': 'Конференции'})
    except Exception as e:
        logger.error(f'Error loading conferences: {str(e)}')
        return render(request, 'events/conferences_list.html', {'events': []})
