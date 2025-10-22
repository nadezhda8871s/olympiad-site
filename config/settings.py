from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden, Http404
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP
import uuid

from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation,
    send_payment_success,
    send_payment_failed,
    send_instructions_comp_conf,
    send_test_result,
)
from .services.export import export_registrations_csv

# ЮKassa SDK
from yookassa import Configuration, Payment as YooPayment


# =========================
# Списки и детали событий
# =========================

def events_list_olymps(request):
    try:
        qs = Event.objects.filter(is_published=True, type=Event.EventType.OLYMPIAD).order_by("sort_order", "-id")
    except (OperationalError, ProgrammingError):
        qs = []
    return render(request, "events/olympiads_list.html", {"events": qs})


def events_list_contests(request):
    try:
        qs = Event.objects.filter(is_published=True, type=Event.EventType.CONTEST).order_by("sort_order", "-id")
    except (OperationalError, ProgrammingError):
        qs = []
    return render(request, "events/contests_list.html", {"events": qs})


def events_list_conferences(request):
    try:
        qs = Event.objects.filter(is_published=True, type=Event.EventType.CONFERENCE).order_by("sort_order", "-id")
    except (OperationalError, ProgrammingError):
        qs = []
    return render(request, "events/conferences_list.html", {"events": qs})


def event_detail(request, slug):
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        raise Http404("Мероприятие недоступно")
    return render(request, "events/detail.html", {"ev": ev})


# =========================
# Регистрация
# =========================

def event_register(request, slug):
    """
    Создание регистрации. После сохранения сразу отправляем на оплату ЮKassa.
    """
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        return render(
            request, "events/info_message.html",
            {"title": "Ошибка", "message": "Мероприятие недоступно."}
        )

    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = form.save(commit=False)
            reg.event = ev
            reg.save()

            send_registration_confirmation(reg.email, ev.title)

            # Создадим Payment, если его нет
            try:
                if not hasattr(reg, "payment") or reg.payment is None:
                    Payment.objects.create(registration=reg, status=Payment.Status.PENDING)
            except Exception:
                pass

            # Сразу в оплату
            return redirect("payment_start", reg_id=reg.id)
    else:
        form = RegistrationForm()

    return render(request, "events/register.html", {"form": form, "ev": ev})


# =========================
# ЮKassa
# =========================

def _yookassa_configure():
    """
    Конфигурация SDK из переменных окружения.
    """
    Configuration.account_id = settings.YOOKASSA_SHOP_ID
    Configuration.secret_key = settings.YOOKASSA_SECRET_KEY


def _as_minor_units(value):
    """
    Возвращает строку вида '123.45' — 2 знака после запятой.
    """
    return f"{Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def payment_start(request, reg_id):
    """
    Создать платёж в ЮKassa и отправить пользователя на confirmation_url.
    """
    try:
        reg = Registration.objects.select_related("event").get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return render(
            request, "events/info_message.html",
            {"title": "Ошибка", "message": "Регистрация не найдена."}
        )

    ev = reg.event
    # Проверяем, настроены ли креды ЮKassa
    if not (getattr(settings, "YOOKASSA_SHOP_ID", None) and getattr(settings, "YOOKASSA_SECRET_KEY", None)):
        return render(
            request, "events/info_message.html",
            {"title": "Оплата недоступна", "message": "Платёжный провайдер не настроен."}
        )

    amount = _as_minor_units(getattr(ev, "price_rub", 0) or 0)
    _yookassa_configure()

    # Куда вернуться после оплаты
    return_path = getattr(settings, "YOOKASSA_SUCCESS_PATH", "/pay/success/")
    return_url = request.build_absolute_uri(return_path)
    sep = "&" if "?" in return_url else "?"
    return_url = f"{return_url}{sep}reg_id={reg.id}"

    payload = {
        "amount": {"value": amount, "currency": "RUB"},
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": return_url},
        "description": f"Оплата участия: {ev.title} (регистрация #{reg.id})",
        "metadata": {"reg_id": reg.id},
    }
    try:
        # Генерируем Idempotence-Key автоматически
        payment = YooPayment.create(payload, str(uuid.uuid4()))
    except Exception as e:
        return render(
            request, "events/info_message.html",
            {"title": "Ошибка оплаты", "message": f"Не удалось создать платёж: {e}"}
        )

    # Сохраним id платежа
    try:
        if hasattr(reg, "payment") and reg.payment:
            reg.payment.txn_id = payment.id
            reg.payment.status = Payment.Status.PENDING
            reg.payment.save()
    except Exception:
        pass

    url = getattr(payment.confirmation, "confirmation_url", None)
    if url:
        return redirect(url)

    return render(
        request, "events/info_message.html",
        {"title": "Ошибка оплаты", "message": "Не удалось получить ссылку подтверждения."}
    )


def payment_success(request):
    """
    Возврат с ЮKassa. Работаем даже БЕЗ вебхука:
    если статус ещё 'pending'/'waiting_for_capture' — показываем "обрабатывается" и делаем до 10 авто-проверок.
    """
    reg_id = request.GET.get("reg_id")
    retry = int(request.GET.get("retry", "0") or 0)
    reg = None

    if not reg_id:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg, "processing": False})

    try:
        reg = Registration.objects.select_related("event", "payment").get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return render(request, "events/payment_result.html", {"success": False, "reg": reg, "processing": False})

    if not reg.payment or not reg.payment.txn_id:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg, "processing": False})

    _yookassa_configure()
    try:
        payment = YooPayment.find_one(reg.payment.txn_id)
    except Exception:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg, "processing": False})

    status = getattr(payment, "status", "")
    if status == "succeeded":
        if reg.payment.status != Payment.Status.PAID:
            reg.payment.status = Payment.Status.PAID
            reg.payment.paid_at = timezone.now()
            reg.payment.save()
            send_payment_success(reg.email, reg.event.title)
            # Для конференций и конкурсов шлём инструкции, как раньше
            if reg.event.type in [Event.EventType.CONFERENCE, Event.EventType.CONTEST]:
                send_instructions_comp_conf(reg.email, reg.event.title)
        return render(request, "events/payment_result.html", {"success": True, "reg": reg, "processing": False})

    if status in ("pending", "waiting_for_capture") and retry < 10:
        # Попросим страницу авто-обновиться и проверить ещё раз
        return render(
            request, "events/payment_result.html",
            {"success": None, "reg": reg, "processing": True, "retry": retry + 1}
        )

    # canceled/failed или слишком много попыток
    return render(request, "events/payment_result.html", {"success": False, "reg": reg, "processing": False})


@csrf_exempt
def payment_webhook(request):
    """
    НЕ обязателен. Если всё же настроите в ЛК ЮKassa — статусы будут обновляться мгновенно.
    """
    if request.method != "POST":
        return HttpResponseForbidden("Method not allowed")

    try:
        import json
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        data = {}

    obj = data.get("object") or {}
    payment_id = obj.get("id")
    status = obj.get("status")
    metadata = obj.get("metadata") or {}
    reg_id = metadata.get("reg_id")

    try:
        if reg_id:
            reg = Registration.objects.select_related("payment").get(id=reg_id)
        else:
            reg = Registration.objects.select_related("payment").get(payment__txn_id=payment_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return JsonResponse({"ok": True})

    if not hasattr(reg, "payment") or reg.payment is None:
        return JsonResponse({"ok": True})

    if status == "succeeded":
        if reg.payment.status != Payment.Status.PAID:
            reg.payment.status = Payment.Status.PAID
            reg.payment.paid_at = timezone.now()
            reg.payment.save()
            send_payment_success(reg.email, reg.event.title)
            if reg.event.type in [Event.EventType.CONFERENCE, Event.EventType.CONTEST]:
                send_instructions_comp_conf(reg.email, reg.event.title)
    elif status in ("canceled", "failed"):
        reg.payment.status = Payment.Status.FAILED
        reg.payment.save()
        send_payment_failed(reg.email, reg.event.title)

    return JsonResponse({"ok": True})


# =========================
# Прочие вспомогательные
# =========================

def test_view(request, reg_id):
    """
    Заглушка (если у вас есть тесты-олимпиады — оставьте вашу реализацию).
    """
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    return render(request, "events/payment_result.html", {"success": True, "reg": reg})


@user_passes_test(lambda u: u.is_staff)
def export_csv_view(request):
    return export_registrations_csv(request)


def search_api(request):
    q = request.GET.get("q", "").strip()
    return JsonResponse({"q": q, "results": []})
