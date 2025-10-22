from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP
import uuid
from yookassa import Configuration, Payment as YooPayment
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
    Added in patch _ROBUST_LIST_BY_TYPE_PATCH.
    """
    try:
        qs = Event.objects.filter(is_published=True, type=type_code).order_by("sort_order", "-id")
        q = request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
    except (OperationalError, ProgrammingError):
        qs = []
        q = ""
    return render(request, template_name, {"events": qs, "page_title": title, "q": q})
# _ROBUST_LIST_BY_TYPE_PATCH

def _list_by_type(request, type_code, title):
    try:
        qs = Event.objects.filter(is_published=True, type=type_code)
        q = request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        date_from = request.GET.get("date_from")
        date_to = request.GET.get("date_to")
        if date_from:
            qs = qs.filter(event_date__gte=date_from)
        if date_to:
            qs = qs.filter(event_date__lte=date_to)
    except (OperationalError, ProgrammingError):
        qs = []
        q = ""
    return render(request, "events/list.html", {"events": qs, "page_title": title, "q": q})

def events_list_olymps(request):
    return _robust_list_by_type(request, Event.EventType.OLYMPIAD, "Олимпиады", "events/olympiads_list.html")

def events_list_contests(request):
    return _robust_list_by_type(request, Event.EventType.CONTEST, "Конкурсы статей, ВКР, научных работ", "events/contests_list.html")

def events_list_conferences(request):
    return _robust_list_by_type(request, Event.EventType.CONFERENCE, "Конференции с публикацией в РИНЦ сборниках", "events/conferences_list.html")
def event_detail(request, pk):
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
            return redirect("payment_start", reg_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "form": form})

def payment_mock(request, reg_id):
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
                "message": "Согласно информационному письму перешлите анкету, научную работу и чек на адрес vsemnayka@gmail.com."
            })
    elif status == "fail":
        reg.payment.status = Payment.Status.FAILED
        reg.payment.save()
        send_payment_failed(reg.email, reg.event.title)
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})

    return render(request, "events/payment_mock.html", {"reg": reg})

def test_view(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
        ev = reg.event
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return HttpResponseForbidden("Тест недоступен.")
    if ev.type != Event.EventType.OLYMPIAD:
        return HttpResponseForbidden("Тест доступен только для олимпиад.")
    if reg.payment.status != Payment.Status.PAID:
        return HttpResponseForbidden("Тест доступен только после успешной оплаты.")
    if reg.results.exists():
        return render(request, "events/test_done.html", {"reg": reg, "score": reg.results.latest("id").score})

    questions = list(ev.questions.prefetch_related("options").all())
    if request.method == "POST":
        score = 0
        answers = {}
        for q in questions:
            chosen_id = request.POST.get(f"q_{q.id}")
            answers[str(q.id)] = chosen_id
            if chosen_id:
                try:
                    opt = q.options.get(id=int(chosen_id))
                    if opt.is_correct:
                        score += 1
                except Exception:
                    pass
        TestResult.objects.create(registration=reg, score=score, answers=answers, finished_at=timezone.now())
        send_test_result(reg.email, ev.title, score)
        return render(request, "events/test_done.html", {"reg": reg, "score": score})
    return render(request, "events/test.html", {"reg": reg, "questions": questions})

def search_api(request):
    q = request.GET.get("q", "").strip()
    results = []
    try:
        if q:
            for ev in Event.objects.filter(is_published=True, title__icontains=q).order_by("sort_order")[:10]:
                results.append({"title": ev.title, "url": ev.get_absolute_url()})
    except (OperationalError, ProgrammingError):
        pass
    return JsonResponse({"results": results})

@user_passes_test(lambda u: u.is_staff)
def export_csv_view(request):
    return export_registrations_csv()

def event_list(request, slug=None):
    """
    Safe list view: never 500s due to DB or missing tables.
    Shows events filtered by category slug if provided.
    """
    from django.db.utils import OperationalError, ProgrammingError
    from django.http import Http404

    events = []
    category = None
    try:
        qs = Event.objects.filter(is_published=True)
        if slug:
            try:
                category = Category.objects.get(slug=slug)
                qs = qs.filter(category=category)
            except Category.DoesNotExist:
                raise Http404("Category not found")
        try:
            qs = qs.order_by("sort_order", "-start_date", "-id")
        except Exception:
            qs = qs.order_by("-id")
        events = list(qs)
    except (OperationalError, ProgrammingError):
        events = []
    ctx = {"events": events, "category": category}
    return render(request, "events/list.html", ctx)

# --- YooKassa integration ---
def _yookassa_configure():
    Configuration.account_id = settings.YOOKASSA_SHOP_ID
    Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

def _as_minor_units(value):
    return f"{Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"

def payment_start(request, reg_id):
    try:
        reg = Registration.objects.select_related("event").get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return render(request, "events/info_message.html", {"title": "Ошибка", "message": "Регистрация не найдена."})
    ev = reg.event
    if not (getattr(settings, "YOOKASSA_SHOP_ID", None) and getattr(settings, "YOOKASSA_SECRET_KEY", None)):
        return render(request, "events/info_message.html", {"title": "Оплата недоступна", "message": "Платёжный провайдер не настроен."})

    amount = _as_minor_units(getattr(ev, "price_rub", 0) or 0)
    _yookassa_configure()
    return_url = request.build_absolute_uri(settings.YOOKASSA_SUCCESS_PATH)
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
        payment = YooPayment.create(payload, str(uuid.uuid4()))
    except Exception as e:
        return render(request, "events/info_message.html", {"title": "Ошибка оплаты", "message": f"Не удалось создать платёж: {e}"})
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
    return render(request, "events/info_message.html", {"title": "Ошибка оплаты", "message": "Не удалось получить ссылку подтверждения."})

def payment_success(request):
    reg_id = request.GET.get("reg_id")
    reg = None
    if not reg_id:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})
    try:
        reg = Registration.objects.select_related("event", "payment").get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})
    if not reg.payment or not reg.payment.txn_id:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})

    _yookassa_configure()
    try:
        payment = YooPayment.find_one(reg.payment.txn_id)
    except Exception:
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})

    if getattr(payment, "status", "") == "succeeded":
        if reg.payment.status != Payment.Status.PAID:
            reg.payment.status = Payment.Status.PAID
            reg.payment.paid_at = timezone.now()
            reg.payment.save()
            send_payment_success(reg.email, reg.event.title)
            if reg.event.type in [Event.EventType.CONFERENCE, Event.EventType.CONTEST]:
                send_instructions_comp_conf(reg.email, reg.event.title)
        return render(request, "events/payment_result.html", {"success": True, "reg": reg})
    return render(request, "events/payment_result.html", {"success": False, "reg": reg})

@csrf_exempt
def payment_webhook(request):
    if request.method != "POST":
        return HttpResponseForbidden("Method not allowed")
    try:
        import json as _json
        data = _json.loads(request.body.decode("utf-8"))
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
