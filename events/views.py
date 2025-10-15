import os
import mimetypes

from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden, FileResponse, Http404
from django.utils.encoding import smart_str
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test

from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
from .services.export import export_registrations_csv

# --- helper: robust check for file existence ---
def _info_file_exists(ev):
    """
    Return True if ev.info_file exists physically or storage reports exists.
    Be defensive: storage.exists may raise for some backends, so fallback to .path check.
    """
    try:
        if not (ev and getattr(ev, "info_file", None) and ev.info_file.name):
            return False
        storage = ev.info_file.storage
        name = ev.info_file.name
        # try storage.exists first
        try:
            if storage.exists(name):
                return True
        except Exception:
            # storage may not implement exists or may fail (S3 misconfiguration etc.)
            pass
        # fallback: try physical path if available
        try:
            path = ev.info_file.path
            return bool(path and os.path.exists(path))
        except Exception:
            return False
    except Exception:
        return False

def _info_file_physical_path(ev):
    """Возвращает физический путь файла если доступен, иначе None."""
    try:
        if ev and getattr(ev, "info_file", None) and ev.info_file.name:
            try:
                return ev.info_file.path
            except Exception:
                return None
    except Exception:
        return None
    return None
# --- end helpers

# --- patched helper for robust list rendering ---
def _robust_list_by_type(request, type_code, title, template_name):
    try:
        qs = Event.objects.filter(is_published=True, type=type_code).order_by("sort_order", "-id")
        q = request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
    except (OperationalError, ProgrammingError):
        qs = []
        q = ""

    # materialize queryset and annotate whether info_file exists
    events = list(qs) if not isinstance(qs, list) else qs
    for ev in events:
        try:
            ev.info_file_exists = _info_file_exists(ev)
        except Exception:
            ev.info_file_exists = False

    return render(request, template_name, {"events": events, "page_title": title, "q": q})
# _ROBUST_LIST_BY_TYPE_PATCH

def _list_by_type(request, type_code, title):
    try:
        qs = Event.objects.filter(is_published=True, type=type_code)
        q = request.GET.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        date_from = request.GET.get("date_from")
        date_to = request.GET.get("date_to")
        if date_from:
            qs = qs.filter(event_date__gte=date_from)
        if date_to:
            qs = qs.filter(event_date__lte=date_to)
    except (OperationalError, ProgrammingError):
        qs = []
        q = ""

    events = list(qs) if not isinstance(qs, list) else qs
    for ev in events:
        try:
            ev.info_file_exists = _info_file_exists(ev)
        except Exception:
            ev.info_file_exists = False

    return render(request, "events/list.html", {"events": events, "page_title": title, "q": q})

def events_list_olymps(request):
    return _robust_list_by_type(request, Event.EventType.OLYMPIAD, "Олимпиады", "events/olympiads_list.html")

def events_list_contests(request):
    return _robust_list_by_type(request, Event.EventType.CONTEST, "Конкурсы статей, ВКР, научных работ", "events/contests_list.html")

def events_list_conferences(request):
    return _robust_list_by_type(request, Event.EventType.CONFERENCE, "Конференции с публикацией в РИНЦ сборниках", "events/conferences_list.html")

def event_detail(request, slug):
    # Ищем мероприятие по slug (URL использует slug)
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None

    if ev:
        try:
            ev.info_file_exists = _info_file_exists(ev)
        except Exception:
            ev.info_file_exists = False

    # Передаём и 'ev' и 'event' — это защитит проектные шаблоны, которые ожидают 'event'
    return render(request, "events/detail.html", {"ev": ev, "event": ev})

def event_register(request, slug):
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except (OperationalError, ProgrammingError):
        ev = None
    if ev is None:
        return render(request, "events/info_message.html", {"title": "Ошибка", "message": "Мероприятие недоступно."})

    try:
        ev.info_file_exists = _info_file_exists(ev)
    except Exception:
        ev.info_file_exists = False

    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            reg = form.save(commit=False)
            reg.event = ev
            reg.save()
            Payment.objects.create(registration=reg, status=Payment.Status.PENDING)
            send_registration_confirmation(reg.email, ev.title, reg.fio)
            return redirect("payment_mock", reg_id=reg.id)
    else:
        form = RegistrationForm()
    return render(request, "events/register.html", {"ev": ev, "event": ev, "form": form})

def payment_mock(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})

    status = request.GET.get("status")
    if status == "success":
        p = reg.payment
        p.status = Payment.Status.PAID
        p.paid_at = timezone.now()
        p.txn_id = f"demo-{p.paid_at.timestamp()}"
        p.save()
        send_payment_success(reg.email, reg.event.title)
        if reg.event.type == Event.EventType.OLYMPIAD:
            return redirect("test_view", reg_id=reg.id)
        else:
            send_instructions_comp_conf(reg.email, reg.event.title)
            return render(request, "events/info_message.html", {
                "title": "Оплата успешна",
                "message": "Согласно информационному письму перешлите анкету, научную работу и чек на адрес vsemnayka@gmail.com[...]"
            })
    elif status == "fail":
        reg.payment.status = Payment.Status.FAILED
        reg.payment.save()
        send_payment_failed(reg.email, reg.event.title)
        return render(request, "events/payment_result.html", {"success": False, "reg": reg})

    return render(request, "events/payment_mock.html", {"reg": reg})

def test_view(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
        ev = reg.event
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return HttpResponseForbidden("Тест недоступен.")
    if ev.type != Event.EventType.OLYMPIAD:
        return HttpResponseForbidden("Тест доступен только для олимпиад.")
    if reg.payment.status != Payment.Status.PAID:
        return HttpResponseForbidden("Тест доступен только после успешной оплаты.")
    if reg.results.exists():
        return render(request, "events/test_done.html", {"reg": reg, "score": reg.results.latest("id").score})

    questions = list(ev.questions.prefetch_related("options").all())
    if request.method == "POST":
        score = 0
        answers = {}
        for q in questions:
            chosen_id = request.POST.get(f"q_{q.id}")
            answers[str(q.id)] = chosen_id
            if chosen_id:
                try:
                    opt = q.options.get(id=int(chosen_id))
                    if opt.is_correct:
                        score += 1
                except Exception:
                    pass
        TestResult.objects.create(registration=reg, score=score, answers=answers, finished_at=timezone.now())
        send_test_result(reg.email, ev.title, score)
        return render(request, "events/test_done.html", {"reg": reg, "score": score})
    return render(request, "events/test.html", {"reg": reg, "questions": questions})

def search_api(request):
    q = request.GET.get("q", "").strip()
    results = []
    try:
        if q:
            for ev in Event.objects.filter(is_published=True, title__icontains=q).order_by("sort_order")[:10]:
                results.append({"title": ev.title, "url": ev.get_absolute_url()})
    except (OperationalError, ProgrammingError):
        pass
    return JsonResponse({"results": results})

@user_passes_test(lambda u: u.is_staff)
def export_csv_view(request):
    return export_registrations_csv()

def event_list(request, slug=None):
    events = []
    category = None
    try:
        qs = Event.objects.filter(is_published=True)
        if slug:
            try:
                category = Category.objects.get(slug=slug)
                qs = qs.filter(category=category)
            except Category.DoesNotExist:
                raise Http404("Category not found")
        try:
            qs = qs.order_by("sort_order", "-start_date", "-id")
        except Exception:
            qs = qs.order_by("-id")
        events = list(qs)
    except (OperationalError, ProgrammingError):
        events = []
    for ev in events:
        try:
            ev.info_file_exists = _info_file_exists(ev)
        except Exception:
            ev.info_file_exists = False
    ctx = {"events": events, "category": category}
    return render(request, "events/list.html", ctx)

# --- Fallback download view: stream file via Django ---
def event_info_download(request, slug):
    """
    Stream file to client using Django FileResponse as a robust fallback.
    Works with FileSystemStorage and with storages that implement .open() (S3 via django-storages).
    """
    try:
        ev = Event.objects.get(slug=slug, is_published=True)
    except Event.DoesNotExist:
        raise Http404("Мероприятие не найдено")

    # Проверяем наличие info_file в модели
    if not (getattr(ev, "info_file", None) and getattr(ev.info_file, "name", None)):
        raise Http404("Файл не найден")

    # Попытка через storage.exists/open
    name = ev.info_file.name
    storage = ev.info_file.storage
    is_present = False
    try:
        try:
            is_present = bool(storage.exists(name))
        except Exception:
            is_present = False
    except Exception:
        is_present = False

    if is_present:
        try:
            f = storage.open(name, mode="rb")
            content_type, _ = mimetypes.guess_type(name)
            if not content_type:
                content_type = "application/octet-stream"
            response = FileResponse(f, content_type=content_type)
            filename = os.path.basename(name)
            response["Content-Disposition"] = f'attachment; filename="{smart_str(filename)}"'
            return response
        except Exception:
            # try physical path below
            pass

    # Fallback to local path if available
    path = _info_file_physical_path(ev)
    if path and os.path.exists(path):
        f = open(path, "rb")
        content_type, _ = mimetypes.guess_type(path)
        if not content_type:
            content_type = "application/octet-stream"
        response = FileResponse(f, content_type=content_type)
        filename = os.path.basename(path)
        response["Content-Disposition"] = f'attachment; filename="{smart_str(filename)}"'
        return response

    # Nothing worked
    raise Http404("Файлы отсутствуют.")
