
from django.core.mail import send_mail
from django.conf import settings

ADMIN_EMAIL = "vsemnayka@gmail.com"

def _safe_send(subject, body, to):
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
    except Exception:
        # Даже если SMTP недоступен, не ломаем пользовательский поток
        pass

def send_registration_confirmation(to_email, event_title, fio):
    subject = "Заявка получена"
    body = f"Уважаемый(ая) {fio}, ваша заявка на мероприятие '{event_title}' получена."
    _safe_send(subject, body, to_email)

def send_payment_success(to_email, event_title):
    _safe_send("Оплата успешна", f"Оплата за '{event_title}' прошла успешно.", to_email)

def send_payment_failed(to_email, event_title):
    _safe_send("Оплата не прошла", f"Оплата за '{event_title}' не прошла. Попробуйте снова.", to_email)

def send_instructions_comp_conf(to_email, event_title):
    body = ("Согласно информационному письму перешлите данные и чек "
            "на адрес vsemnayka@gmail.com.")
    _safe_send("Инструкции по отправке материалов", body, to_email)

def send_test_result(to_email, event_title, score):
    _safe_send("Результат теста", f"Ваш результат по '{event_title}': {score}", to_email)
