from django.core.mail import send_mail
from django.conf import settings

ADMIN_EMAIL = "vsemnayka@gmail.com"

def send_registration_confirmation(to_email, event_title, fio):
    subject = "Заявка получена"
    body = f"Уважаемый(ая) {fio}, ваша заявка на мероприятие '{event_title}' получена."
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email])

def send_payment_success(to_email, event_title):
    send_mail("Оплата успешна", f"Оплата за '{event_title}' прошла успешно.", settings.DEFAULT_FROM_EMAIL, [to_email])

def send_payment_failed(to_email, event_title):
    send_mail("Оплата не прошла", f"Оплата за '{event_title}' не прошла. Попробуйте снова.", settings.DEFAULT_FROM_EMAIL, [to_email])

def send_instructions_comp_conf(to_email, event_title):
    body = ("Согласно информационному письму перешлите данные и чек "
            "на адрес vsemnayka@gmail.com.")
    send_mail("Инструкции по отправке материалов", body, settings.DEFAULT_FROM_EMAIL, [to_email])

def send_test_result(to_email, event_title, score):
    send_mail("Результат теста", f"Ваш результат по '{event_title}': {score}", settings.DEFAULT_FROM_EMAIL, [to_email])
