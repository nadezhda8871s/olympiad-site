from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test
from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
from .services.export import export_registrations_csv

# --- patched helper for robust list rendering ---
def _robust_list_by_type(request, type_code, title, template_name):
    """Robust list renderer with safe DB fallbacks and stable ordering.
    ... (остальная часть файла без изменений до блока оплаты) ...
    """
    Safe detail view: never 500s if DB columns/relations temporarily unavailable.
    """
    from django.db.utils import OperationalError, ProgrammingError
    ev = None
    try:
        ev = get_object_or_404(Event, pk=pk, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    return render(request, "events/detail.html", {"ev": ev})
def event_register(request, slug):
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        return render(request, "events/info_message.html", {"title": "Ошибка", "message": "Мероприятие недоступно."})
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = form.save(commit=False)
            reg.event = ev
            reg.save()
            Payment.objects.create(registration=reg, status=Payment.Status.PENDING)
            send_registration_confirmation(reg.email, ev.title, reg.fio)
            return redirect("payment_mock", reg_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "form": form})

# ... (пропущены промежуточные функции списка/поиска/экспорта и т.п.) ...

def payment_mock(request, reg_id):
    """Страница оплаты через YooKassa (SimplePay).
    Сохраняем reg_id в сессии для последующего редиректа со страницы успеха.
    """
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})
    # Запомним текущую регистрацию для обработки success/fail редиректов от ЮKassa
    try:
        request.session['current_reg_id'] = reg.id
    except Exception:
        pass
    return render(request, "events/payment_mock.html", {"reg": reg})

def payment_success(request):
    """Обработчик 'Страницы успеха' — вызывается ЮKassa после оплаты.
    Используем reg_id из сессии (или ?reg_id=...) как быстрый способ связать оплату с регистрацией.
    """
    reg_id = request.session.get('current_reg_id') or request.GET.get('reg_id')
    reg = None
    if reg_id:
        try:
            reg = Registration.objects.get(id=int(reg_id))
        except (ValueError, Registration.DoesNotExist, OperationalError, ProgrammingError):
            reg = None
    if reg is None:
        # Показываем общий успех без изменения статуса
        return render(request, "events/payment_result.html", {"success": True, "reg": None})
    # Отмечаем оплату
    p = reg.payment
    p.status = Payment.Status.PAID
    p.paid_at = timezone.now()
    p.txn_id = p.txn_id or f"ykassa-{int(p.paid_at.timestamp())}"
    p.save()
    send_payment_success(reg.email, reg.event.title)
    # Если это олимпиада — сразу даём пройти тест
    if reg.event.type == Event.EventType.OLYMPIAD:
        return redirect("test_view", reg_id=reg.id)
    # Иначе отправляем инструкции и показываем страницу успеха
    send_instructions_comp_conf(reg.email, reg.event.title)
    return render(request, "events/payment_result.html", {"success": True, "reg": reg})

def payment_fail(request):
    """Обработчик страницы ошибки оплаты."""
    reg_id = request.session.get('current_reg_id') or request.GET.get('reg_id')
    reg = None
    if reg_id:
        try:
            reg = Registration.objects.get(id=int(reg_id))
        except (ValueError, Registration.DoesNotExist, OperationalError, ProgrammingError):
            reg = None
    if reg:
        reg.payment.status = Payment.Status.FAILED
        reg.payment.save()
        send_payment_failed(reg.email, reg.event.title)
    return render(request, "events/payment_result.html", {"success": False, "reg": reg})

# ... (остальные функции: test_view, API и т.п. остаются без изменений) ...
