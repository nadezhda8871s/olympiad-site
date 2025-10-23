import os
import logging
from yookassa import Configuration, Payment

logger = logging.getLogger(__name__)

YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
YOOKASSA_TEST_MODE = os.getenv("YOOKASSA_TEST_MODE", "True").lower() in ("1", "true", "yes")

if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY:
    Configuration.account_id = YOOKASSA_SHOP_ID
    Configuration.secret_key = YOOKASSA_SECRET_KEY

def create_payment(registration, amount_rub, return_url):
    """
    Создаёт платёж в YooKassa и возвращает словарь с id, status и checkout_url.
    registration: экземпляр модели Registration (используется для metadata.registration_id)
    amount_rub: сумма в рублях (число или строка)
    return_url: URL, на который вернётся пользователь после оплаты
    """
    amount = {
        "value": "{:.2f}".format(float(amount_rub)),
        "currency": "RUB"
    }
    try:
        payment = Payment.create({
            "amount": amount,
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "capture": True,
            "description": f"Оплата регистрации #{getattr(registration, 'id', '')}",
            "metadata": {"registration_id": str(getattr(registration, "id", ""))}
        }, uuid=None)
        checkout_url = None
        confirmation = getattr(payment, "confirmation", {}) or {}
        checkout_url = confirmation.get("confirmation_url") or getattr(confirmation, "confirmation_url", None)
        return {"id": payment.id, "status": payment.status, "checkout_url": checkout_url, "raw": payment}
    except Exception:
        logger.exception("YooKassa create_payment error")
        raise

def get_payment(payment_id):
    try:
        p = Payment.find_one(payment_id)
        return p
    except Exception:
        logger.exception("YooKassa get_payment error")
        return None
