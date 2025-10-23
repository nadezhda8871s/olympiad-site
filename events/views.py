import json
import logging
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test

from .models import Event, Registration, Payment as PaymentModel, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
from .services.export import export_registrations_csv
from .services.yookassa import create_payment, get_payment

logger = logging.getLogger(__name__)

def event_register(request, slug):
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except Exception:
        ev = None
    if ev is None:
        return render(request, "events/info_message.html", {"title": "Ошибка", "message": "Мероприятие недоступно."})
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = form.save(commit=False)
            reg.event = ev
            reg.save()
            PaymentModel.objects.create(registration=reg, status=PaymentModel.Status.PENDING)
            send_registration_confirmation(reg.email, ev.title, reg.fio)
            return redirect("events:start_payment_yookassa", reg_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "form": form})

def start_payment_yookassa(request, reg_id):
    try:
        reg = Registration.objects.get(pk=reg_id)
    except Registration.DoesNotExist:
        return HttpResponse("Registration not found", status=404)

    amount = getattr(reg, "amount", None) or getattr(reg.event, "price_rub", None) or 110
    return_url = request.build_absolute_uri(reverse("events:payment_result", args=[reg.id]))
    try:
        res = create_payment(registration=reg, amount_rub=amount, return_url=return_url)
    except Exception:
        logger.exception("Cannot create YooKassa payment")
        return HttpResponse("Ошибка создания платежа", status=500)

    payment_obj, _ = PaymentModel.objects.get_or_create(registration=reg)
    payment_obj.yookassa_payment_id = res.get("id")
    payment_obj.payment_status = res.get("status")
    payment_obj.save()

    checkout_url = res.get("checkout_url")
    if not checkout_url:
        return render(request, "events/payment_mock.html", {"reg": reg, "checkout_url": None})
    return redirect(checkout_url)

@csrf_exempt
def yookassa_webhook(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseForbidden("Invalid payload")

    payment_id = None
    try:
        obj = payload.get("object", {}) or {}
        payment_id = obj.get("id") or obj.get("payment", {}).get("id")
    except Exception:
        payment_id = None

    if not payment_id:
        return HttpResponse("no payment id", status=200)

    yk_payment = get_payment(payment_id)
    if not yk_payment:
        return HttpResponse("payment not found", status=200)

    pm = PaymentModel.objects.filter(yookassa_payment_id=payment_id).first()
    reg = None
    if not pm:
        try:
            metadata = getattr(yk_payment, "metadata", {}) or {}
            reg_id = metadata.get("registration_id")
            if reg_id:
                reg = Registration.objects.filter(pk=reg_id).first()
                if reg:
                    pm, _ = PaymentModel.objects.get_or_create(registration=reg)
        except Exception:
            reg = None

    if pm:
        pm.update_from_yookassa(yk_payment)
        if getattr(yk_payment, "status", "") in ("succeeded", "succeeded_wait_for_capture", "succeeded"):
            try:
                reg = pm.registration
                if hasattr(reg, "is_paid"):
                    reg.is_paid = True
                    reg.save()
                send_payment_success(reg.email, reg.event.title)
            except Exception:
                logger.exception("Can't mark registration paid or send notifications")
    return HttpResponse("ok")


def payment_result(request, reg_id):
    """Handler for return from YooKassa checkout."""
    try:
        reg = Registration.objects.get(pk=reg_id)
    except Registration.DoesNotExist:
        return HttpResponse("Registration not found", status=404)
    
    payment = reg.payment
    if payment.status == PaymentModel.Status.PAID:
        # Already paid, redirect to test or show success
        if reg.event.type == Event.EventType.OLYMPIAD:
            return redirect("test_view", reg_id=reg.id)
        else:
            send_instructions_comp_conf(reg.email, reg.event.title)
            return render(request, "events/info_message.html", {
                "title": "Оплата успешна",
                "message": "Согласно информационному письму перешлите анкету, научную работу и чек на адрес vsemnayka@gmail.com."
            })
    else:
        # Payment not confirmed yet
        return render(request, "events/payment_result.html", {
            "success": False, 
            "reg": reg,
            "message": "Платёж ещё не подтверждён. Пожалуйста, подождите несколько минут."
        })


def payment_mock(request, reg_id):
    """Legacy payment mock view - now redirects to YooKassa."""
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})
    
    # Redirect to YooKassa payment
    return redirect("events_yookassa:start_payment_yookassa", reg_id=reg.id)


def test_view(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
        ev = reg.event
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return HttpResponseForbidden("Тест недоступен.")
    if ev.type != Event.EventType.OLYMPIAD:
        return HttpResponseForbidden("Тест доступен только для олимпиад.")
    if reg.payment.status != PaymentModel.Status.PAID:
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


# --- patched helper for robust list rendering ---
def _robust_list_by_type(request, type_code, title, template_name):
    """Robust list renderer with safe DB fallbacks and stable ordering."""
    try:
        qs = Event.objects.filter(is_published=True, type=type_code).order_by("sort_order", "-id")
        q = request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
    except (OperationalError, ProgrammingError):
        qs = []
        q = ""
    return render(request, template_name, {"events": qs, "page_title": title, "q": q})


def events_list_olymps(request):
    return _robust_list_by_type(request, Event.EventType.OLYMPIAD, "Олимпиады", "events/olympiads_list.html")


def events_list_contests(request):
    return _robust_list_by_type(request, Event.EventType.CONTEST, "Конкурсы статей, ВКР, научных работ", "events/contests_list.html")


def events_list_conferences(request):
    return _robust_list_by_type(request, Event.EventType.CONFERENCE, "Конференции с публикацией в РИНЦ сборниках", "events/conferences_list.html")


def event_detail(request, slug):
    """Safe detail view: never 500s if DB columns/relations temporarily unavailable."""
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    return render(request, "events/detail.html", {"ev": ev})
