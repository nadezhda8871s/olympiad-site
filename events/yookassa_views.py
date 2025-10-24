from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from .models import Registration

@csrf_exempt
def yookassa_webhook(request):
    """
    Обработка уведомлений от YooKassa (payment.succeeded, canceled, refund.succeeded)
    """
    from django.utils import timezone
    import json
    from .models import Payment

    if request.method != "POST":
        return HttpResponse(status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
        event = data.get("event")
        obj = data.get("object", {})
        payment_id = obj.get("id")

        # ищем запись платежа
        payment = Payment.objects.filter(yookassa_payment_id=payment_id).first()
        if payment:
            payment.payment_status = event
            payment.updated_at = timezone.now()
            payment.save()
        return HttpResponse("OK")
    except Exception as e:
        return HttpResponse(f"Error: {e}", status=400)


def yookassa_payment_form(request, reg_id):
    """
    Страница с HTML-формой YooKassa SimplePay
    """
    reg = get_object_or_404(Registration, id=reg_id)
    context = {
        "email": getattr(reg, "email", ""),
        "phone": getattr(reg, "phone", ""),
        "name": f"{getattr(reg, 'last_name', '')} {getattr(reg, 'first_name', '')}".strip(),
        "amount": getattr(reg.event, "price_rub", 0),
    }
    return render(request, "events/yookassa_form.html", context)


def pay_success(request):
    """
    Страница после успешной оплаты
    """
    return render(request, "events/pay_success.html")
