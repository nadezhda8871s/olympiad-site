from django.core.mail import send_mail

def notify(to, subject, body):
    send_mail(subject, body, None, [to], fail_silently=True)
