
import json
import logging
from decimal import Decimal
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Registration, Payment as AppPayment
from .services.yookassa import YooKassaService

logger = logging.getLogger(__name__)

@require_http_methods(["POST"])
@csrf_exempt
def yookassa_webhook(request):
    """Handle YooKassa notifications at /pay/success/ as requested."""
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception as e:
        logger.warning("Invalid JSON in webhook: %s", e)
        return HttpResponseBadRequest("invalid json")

    event = data.get("event")
    obj = data.get("object", {})
    payment_id = obj.get("id")
    amount = obj.get("amount", {}).get("value")
    status = obj.get("status")

    # YooKassa stores our registration/payment id in metadata if we set it
    metadata = obj.get("metadata", {})
    reg_id = metadata.get("reg_id") or metadata.get("registration_id")
    app_payment = None

    if reg_id:
        try:
            reg = Registration.objects.get(id=int(reg_id))
            app_payment, _ = AppPayment.objects.get_or_create(registration=reg)
        except Registration.DoesNotExist:
            logger.error("Webhook: registration %s not found", reg_id)

    logger.info("YooKassa webhook: event=%s payment_id=%s status=%s", event, payment_id, status)

    # Update our payment record if we have one
    if app_payment:
        # set fields if they exist
        for field, value in [
            ("yookassa_payment_id", payment_id),
            ("payment_status", status),
        ]:
            if hasattr(app_payment, field):
                setattr(app_payment, field, value)

        if event == "payment.succeeded" and status == "succeeded":
            app_payment.status = AppPayment.Status.PAID
        elif event in ("payment.canceled",) or status in ("canceled", "canceled_by_merchant", "refunded"):
            app_payment.status = AppPayment.Status.FAILED
        elif event == "payment.waiting_for_capture" or status in ("waiting_for_capture", "pending"):
            app_payment.status = AppPayment.Status.PENDING
        app_payment.save()

    return JsonResponse({"ok": True})

@require_http_methods(["POST"])  # typically called after user submits registration
def start_payment_yookassa(request, reg_id: int):
    reg = get_object_or_404(Registration, pk=reg_id)
    # Ensure payment row exists
    app_payment, _ = AppPayment.objects.get_or_create(registration=reg)

    amount = reg.event.price_rub or 0
    amount = Decimal(amount)

    yk = YooKassaService()
    ok, result = yk.create_payment(
        amount=amount,
        description=f"Оплата участия: {reg.event.title} ({reg.fio})",
        return_url=settings.YOOKASSA_RETURN_URL or request.build_absolute_uri(reverse('events:payment_result')),
        metadata={"reg_id": reg.id},
        capture=True
    )
    if not ok:
        logger.error("Failed to create YooKassa payment: %s", result)
        return HttpResponse("Ошибка создания платежа", status=502)

    # store id if field exists
    if hasattr(app_payment, "yookassa_payment_id"):
        app_payment.yookassa_payment_id = result.get("id")
        app_payment.payment_status = result.get("status")
        app_payment.save()

    confirmation = result.get("confirmation", {})
    url = confirmation.get("confirmation_url")
    if url:
        return redirect(url)
    return HttpResponse("Не удалось получить ссылку на оплату", status=500)
