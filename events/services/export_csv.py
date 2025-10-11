import csv
from django.http import HttpResponse

def export_registrations_csv(queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="registrations.csv"'
    writer = csv.writer(response)
    writer.writerow(["Дата","Мероприятие","ФИО","Уч. заведение","Город","Email","Телефон","Статус оплаты","Результат"])
    for r in queryset:
        payment = getattr(r, "payment", None)
        status = payment.status if payment else "pending"
        from events.models import TestResult
        score = ""
        try:
            tr = TestResult.objects.get(registration=r)
            score = tr.score
        except TestResult.DoesNotExist:
            score = ""
        writer.writerow([r.created_at, r.event.title, r.fio, r.org, r.city, r.email, r.phone, status, score])
    return response
