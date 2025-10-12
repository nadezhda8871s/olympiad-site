import csv
from django.http import HttpResponse
from .models import Registration

def export_registrations_csv():
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="registrations.csv"'
    writer = csv.writer(response)
    writer.writerow(["Дата", "Мероприятие", "ФИО", "Уч. заведение", "Город", "Email", "Телефон", "Статус оплаты", "Балл"])
    for r in Registration.objects.select_related("event").all().order_by("-created_at"):
        payment = getattr(r, "payment", None)
        status = payment.status if payment else "pending"
        result = r.results.order_by("-id").first()
        score = result.score if result else ""
        writer.writerow([r.created_at.date(), r.event.title, r.fio, r.org, r.city, r.email, r.phone, status, score])
    return response
