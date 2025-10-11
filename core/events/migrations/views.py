from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.payments_mock import pay as mock_pay
from .services.export_csv import export_registrations_csv
from .services.mailer import notify

def home(request):
    featured = Event.objects.filter(is_published=True, is_featured=True).order_by("sort_order","-created_at")[:12]
    return render(request, "events/home.html", {"featured": featured})

def _list_by_type(request, t):
    qs = Event.objects.filter(is_published=True, type=t).order_by("sort_order","-created_at")
    q = request.GET.get("q","").strip()
    if q:
        qs = qs.filter(title__icontains=q)
    # фильтр по дате — простая заглушка: сортировка уже по дате создания
    return render(request, "events/list.html", {"items": qs, "q": q, "type": t})

def list_olympiads(request): return _list_by_type(request, "olympiad")
def list_contests(request): return _list_by_type(request, "contest")
def list_conferences(request): return _list_by_type(request, "conference")

def event_detail(request, slug):
    ev = get_object_or_404(Event, slug=slug, is_published=True)
    return render(request, "events/detail.html", {"ev": ev})

def register_event(request, slug):
    ev = get_object_or_404(Event, slug=slug, is_published=True)
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = Registration.objects.create(
                event=ev,
                fio=form.cleaned_data["fio"],
                org=form.cleaned_data["org"],
                city=form.cleaned_data["city"],
                email=form.cleaned_data["email"],
                phone=form.cleaned_data["phone"],
                consent_pd=form.cleaned_data["consent_pd"],
            )
            pay = Payment.objects.create(registration=reg, status="pending")
            notify(reg.email, "Регистрация получена", f"Вы зарегистрировались на мероприятие: {ev.title}")
            return redirect("pay_choice", order_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "form": form})

def pay_choice(request, order_id):
    return render(request, "events/pay_choice.html", {"order_id": order_id})

def pay_success(request, order_id):
    reg = get_object_or_404(Registration, id=order_id)
    pay_info = mock_pay(order_id, True)
    p = Payment.objects.get(registration=reg)
    p.status = "paid"
    p.paid_at = timezone.now()
    p.txn_id = "demo"
    p.save()
    if reg.event.type == "olympiad":
        notify(reg.email, "Оплата успешна", "Оплата прошла успешно. Можете начать тест.")
        return redirect("test_start", order_id=reg.id)
    else:
        msg = "Согласно информационному письму перешлите данные и чек на vsemnayka@gmail.com"
        notify(reg.email, "Оплата успешна", msg)
        return render(request, "events/pay_success.html", {"reg": reg, "message": msg})

def pay_fail(request, order_id):
    reg = get_object_or_404(Registration, id=order_id)
    p = Payment.objects.get(registration=reg)
    p.status = "failed"
    p.save()
    notify(reg.email, "Оплата неуспешна", "Оплата не прошла. Попробуйте снова.")
    return render(request, "events/pay_fail.html", {"reg": reg})

def test_start(request, order_id):
    reg = get_object_or_404(Registration, id=order_id)
    if reg.event.type != "olympiad": return redirect("home")
    return render(request, "events/test_start.html", {"reg": reg})

def test_run(request, order_id):
    reg = get_object_or_404(Registration, id=order_id)
    if reg.event.type != "olympiad": return redirect("home")
    questions = Question.objects.filter(event=reg.event).order_by("order")
    if request.method == "POST":
        score = 0
        details = {}
        for q in questions:
            ans = request.POST.get(f"q{q.id}")
            details[str(q.id)] = ans
            try:
                correct = AnswerOption.objects.get(question=q, is_correct=True)
                if ans == str(correct.id): score += 1
            except AnswerOption.DoesNotExist:
                pass
        TestResult.objects.update_or_create(registration=reg, defaults={"score": score, "details": details})
        notify(reg.email, "Результат теста", f"Ваш результат: {score}")
        return render(request, "events/test_start.html", {"reg": reg, "done": True, "score": score})
    return render(request, "events/test_run.html", {"reg": reg, "questions": questions})

def export_csv(request):
    from .models import Registration
    qs = Registration.objects.select_related("event").order_by("-created_at")
    return export_registrations_csv(qs)
