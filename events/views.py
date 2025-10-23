import json
import logging
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.utils import timezone

from .models import Event, Registration, Payment as PaymentModel
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
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
