from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden, HttpResponse, HttpResponseBadRequest
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test
from django.views.decorators.csrf import csrf_exempt
from decimal import Decimal, ROUND_DOWN
import os

from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
from .services.export import export_registrations_csv

# Try import YooKassa SDK (optional - will fallback to mock)
try:
    from yookassa import Configuration, Payment as YooPayment
except Exception:
    YooPayment = None
    Configuration = None

# --- patched helper for robust list rendering ---
def _robust_list_by_type(request, type_code, title, template_name):
    """Robust list renderer with safe DB fallbacks and stable ordering.
    This returns a rendered template with 'events' context variable.
    """
    try:
        from .models import Event as Ev
        qs = Ev.objects.filter(type=type_code, is_published=True)
        try:
            qs = qs.order_by("sort_order", "-event_date", "-id")
        except Exception:
            qs = qs.order_by("-id")
        events = list(qs)
    except (OperationalError, ProgrammingError):
        events = []
    return render(request, template_name, {"events": events, "title": title})

def events_list_olymps(request):
    return _robust_list_by_type(request, Event.EventType.OLYMPIAD, "Олимпиады", "events/olympiads_list.html")

def events_list_contests(request):
    return _robust_list_by_type(request, Event.EventType.CONTEST, "Конкурсы", "events/contests_list.html")

def events_list_conferences(request):
    return _robust_list_by_type(request, Event.EventType.CONFERENCE, "Конференции", "events/conferences_list.html")

def event_detail(request, slug):
    try:
        ev = Event.objects.get(slug=slug)
    except (Event.DoesNotExist, OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        return render(request, "events/info_message.html", {"title": "Мероприятие", "message": "Мероприятие не найдено."})
    return render(request, "events/detail.html", {"ev": ev})

def event_register(request, slug):
    try:
        ev = Event.objects.get(slug=slug)
    except (Event.DoesNotExist, OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        return render(request, "events/info_message.html", {"title": "Регистрация", "message": "Мероприятие не найдено."})
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = form.save(commit=False)
            reg.event = ev
            reg.save()
            Payment.objects.create(registration=reg, status=Payment.Status.PENDING)
            send_registration_confirmation(reg.email, ev.title, reg.fio)
            return redirect("payment_start", reg_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "form": form})

def payment_mock(request, reg_id):
    # legacy demo mock kept for compatibility (now labelled YooKassa mock)
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})

    status = request.GET.get("status")
    if status == "success":
        p = reg.payment
        p.status = Payment.Status.PAID
        p.paid_at = timezone.now()
        p.txn_id = f"demo-{p.paid_at.timestamp()}"
        p.save()
        send_payment_success(reg.email, reg.event.title)
        if reg.event.type == Event.EventType.OLYMPIAD:
            return redirect("test_view", reg_id=reg.id)
        else:
            send_instructions_comp_conf(reg.email, reg.event.title)
            return render(request, "events/info_message.html", {
                "title": "Оплата успешна",
                "message": "В ближайшее время вам придёт письмо с инструкциями."
            })
    elif status == "fail":
        p = reg.payment
        p.status = Payment.Status.FAILED
        p.save()
        send_payment_failed(reg.email, reg.event.title)
        return render(request, "events/info_message.html", {
            "title": "Оплата неуспешна",
            "message": "Платёж не прошёл."
        })

    return render(request, "events/payment_mock.html", {"reg": reg})

def test_view(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Тест", "message": "Регистрация не найдена."})
    # Placeholder: actual test flow
    questions = []
    try:
        questions = Question.objects.filter(event=reg.event)
    except Exception:
        questions = []
    return render(request, "events/test.html", {"reg": reg, "questions": questions})

def search_api(request):
    q = request.GET.get("q", "")
    try:
        qs = Event.objects.filter(title__icontains=q)[:10]
        results = [{"id": e.id, "title": e.title, "slug": e.slug} for e in qs]
    except Exception:
        results = []
    return JsonResponse({"results": results})

def export_csv_view(request):
    return export_registrations_csv()

def _decimal_to_str(amount):
    """Convert Decimal or numeric to string with 2 decimal places for YooKassa."""
    if amount is None:
        return "0.00"
    if isinstance(amount, Decimal):
        return str(amount.quantize(Decimal("0.01"), rounding=ROUND_DOWN))
    try:
        return "{:.2f}".format(float(amount))
    except Exception:
        return "0.00"

def payment_start(request, reg_id):
    """Create a YooKassa payment and redirect user to confirmation_url."""
    try:
        reg = Registration.objects.get(id=reg_id)
    except Registration.DoesNotExist:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})
    # prevent paying already paid
    if hasattr(reg, 'payment') and reg.payment.status == Payment.Status.PAID:
        return render(request, "events/payment_result.html", {"success": True})
    # load credentials
    shop_id = os.getenv('YOOKASSA_SHOP_ID')
    secret = os.getenv('YOOKASSA_SECRET_KEY')
    if not shop_id or not secret or YooPayment is None:
        # fallback to mock
        return redirect('payment_mock', reg_id=reg.id)

    Configuration.account_id = shop_id
    Configuration.secret_key = secret

    amount_value = _decimal_to_str(getattr(reg.event, "price_rub", 0))
    amount = {
        "value": amount_value,
        "currency": "RUB"
    }
    # create payment
    try:
        payment = YooPayment.create({
            "amount": amount,
            "capture": True,
            "confirmation": {"type": "redirect", "return_url": request.build_absolute_uri('/pay/success/')},
            "description": f"Оплата регистрации #{reg.id} — {reg.event.title}",
            "metadata": {"registration_id": str(reg.id)}
        }, uuid=None)
    except Exception as e:
        # On error, show informative message
        return render(request, "events/info_message.html", {"title": "Ошибка оплаты", "message": f"Не удалось создать платёж: {e}"})

    # save payment record if exists
    p = None
    if hasattr(reg, 'payment'):
        p = reg.payment
        p.status = Payment.Status.PENDING
        p.txn_id = getattr(payment, "id", None) or getattr(payment, "payment_id", None)
        p.save()
    else:
        p = Payment.objects.create(registration=reg, status=Payment.Status.PENDING, txn_id=getattr(payment, "id", None))

    # redirect to confirmation url
    try:
        url = payment.confirmation.confirmation_url
    except Exception:
        url = None
        if isinstance(payment, dict):
            conf = payment.get("confirmation") or {}
            url = conf.get("confirmation_url") or conf.get("confirmation_url")  # fallback

    if not url:
        # As a last resort, try to extract from payment object
        try:
            url = payment.get("confirmation", {}).get("confirmation_url") if isinstance(payment, dict) else None
        except Exception:
            url = None

    if not url:
        return render(request, "events/info_message.html", {"title": "Ошибка оплаты", "message": "Не удалось получить URL для оплаты."})

    return redirect(url)


def pay_success(request):
    """Return URL after successful payment (user is redirected here). We will check payment status via API or rely on webhook."""
    # For simplicity, show success page. Webhook will update payment status.
    return render(request, "events/payment_result.html", {"success": True})


@csrf_exempt
def pay_webhook(request):
    """Handle YooKassa webhook notifications (Payment events)."""
    if request.method != 'POST':
        return HttpResponseBadRequest('Invalid method')
    import json
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return HttpResponseBadRequest('Bad JSON')

    # YooKassa sends event with object containing payment info
    # Example: {"event":"payment.succeeded","object":{...}}
    obj = payload.get('object') or payload.get('notification') or payload
    payment_obj = None
    if isinstance(obj, dict):
        # yookassa may nest payment under 'payment' or 'object'
        payment_obj = obj.get('payment') or obj.get('object') or obj
    elif isinstance(payload, dict):
        payment_obj = payload.get('payment') or payload

    # Extract metadata or description to find registration
    metadata = payment_obj.get('metadata') if isinstance(payment_obj, dict) else {}
    reg_id = None
    if isinstance(metadata, dict):
        reg_id = metadata.get('registration_id')
    if not reg_id:
        desc = payment_obj.get('description') if isinstance(payment_obj, dict) else None
        if desc:
            # try extract '#<id>' from description
            import re
            m = re.search(r"#(\d+)", desc)
            if m:
                reg_id = m.group(1)

    if not reg_id:
        return HttpResponse('no registration', status=200)

    try:
        reg = Registration.objects.get(id=int(reg_id))
    except Exception:
        return HttpResponse('registration not found', status=200)

    status = (payment_obj.get('status') or "").lower() if isinstance(payment_obj, dict) else ""
    p = getattr(reg, 'payment', None)
    if status in ('succeeded', 'succeeded', 'succeeded', 'completed', 'paid'):
        if p:
            p.status = Payment.Status.PAID
            p.paid_at = timezone.now()
            p.txn_id = payment_obj.get('id') or p.txn_id
            p.save()
        else:
            Payment.objects.create(registration=reg, status=Payment.Status.PAID, paid_at=timezone.now(), txn_id=payment_obj.get('id'))
        try:
            send_payment_success(reg.email, reg.event.title)
        except Exception:
            pass
    elif status in ('canceled', 'failed', 'waiting_for_capture'):
        if p:
            p.status = Payment.Status.FAILED
            p.txn_id = payment_obj.get('id') or p.txn_id
            p.save()
        try:
            send_payment_failed(reg.email, reg.event.title)
        except Exception:
            pass

    return HttpResponse('ok', status=200)
