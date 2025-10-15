import os
import mimetypes
import logging

from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden, FileResponse, Http404
from django.utils.encoding import smart_str
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.decorators import user_passes_test

from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
# Category может отсутствовать в вашей модели — импортируем защищённо
try:
    from .models import Category
except Exception:
    Category = None

from .forms import RegistrationForm
from .services.emails import (
    send_registration_confirmation, send_payment_success, send_payment_failed,
    send_instructions_comp_conf, send_test_result
)
from .services.export import export_registrations_csv

logger = logging.getLogger(__name__)

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
            logger.debug("storage.exists raised for %s", name, exc_info=True)
            pass
        # fallback: try physical path if available
        try:
            path = ev.info_file.path
            return bool(path and os.path.exists(path))
        except Exception:
            logger.debug("ev.info_file.path unavailable for %s", getattr(ev, "pk", None), exc_info=True)
            return False
    except Exception:
        logger.exception("Unexpected error when checking info_file existence for ev=%s", getattr(ev, "pk", None))
        return False

def _info_file_physical_path(ev):
    """Return physical path if available, else None."""
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

def _render_service_unavailable(request, title="Временно недоступно", message="Сайт временно недоступен. Попробуйте позже."):
    """Centralized fallback render to avoid 500s on public pages."""
    return render(request, "events/info_message.html", {"title": title, "message": message})

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

    try:
        # materialize queryset and annotate whether info_file exists
        events = list(qs) if not isinstance(qs, list) else qs
        for ev in events:
            try:
                ev.info_file_exists = _info_file_exists(ev)
            except Exception:
                logger.exception("Failed to annotate info_file_exists for event %s", getattr(ev, "pk", None))
                ev.info_file_exists = False
        return render(request, template_name, {"events": events, "page_title": title, "q": q})
    except Exception:
        logger.exception("Unhandled error in _robust_list_by_type for type %s", type_code)
        return _render_service_unavailable(request)

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

    try:
        events = list(qs) if not isinstance(qs, list) else qs
        for ev in events:
            try:
                ev.info_file_exists = _info_file_exists(ev)
            except Exception:
                logger.exception("Failed to annotate info_file_exists for event %s", getattr(ev, "pk", None))
                ev.info_file_exists = False
        return render(request, "events/list.html", {"events": events, "page_title": title, "q": q})
    except Exception:
        logger.exception("Unhandled error in _list_by_type for type %s", type_code)
        return _render_service_unavailable(request)

def events_list_olymps(request):
    try:
        return _robust_list_by_type(request, Event.EventType.OLYMPIAD, "Олимпиады", "events/olympiads_list.html")
    except Exception:
        logger.exception("events_list_olymps failed")
        return _render_service_unavailable(request)

def events_list_contests(request):
    try:
        return _robust_list_by_type(request, Event.EventType.CONTEST, "Конкурсы статей, ВКР, научных работ", "events/contests_list.html")
    except Exception:
        logger.exception("events_list_contests failed")
        return _render_service_unavailable(request)

def events_list_conferences(request):
    try:
        return _robust_list_by_type(request, Event.EventType.CONFERENCE, "Конференции с публикацией в РИНЦ сборниках", "events/conferences_list.html")
    except Exception:
        logger.exception("events_list_conferences failed")
        return _render_service_unavailable(request)

def event_detail(request, slug):
    try:
        # Find event
        ev = get_object_or_404(Event, slug=slug, is_published=True)
        try:
            ev.info_file_exists = _info_file_exists(ev)
        except Exception:
            ev.info_file_exists = False
        return render(request, "events/detail.html", {"ev": ev, "event": ev})
    except Http404:
        raise
    except Exception:
        logger.exception("Unhandled error in event_detail for slug=%s", slug)
        return _render_service_unavailable(request)

def event_register(request, slug):
    try:
        ev = get_object_or_404(Event, slug=slug, is_published=True)
    except Http404:
        raise
    except Exception:
        logger.exception("Error fetching event for register slug=%s", slug)
        return _render_service_unavailable(request)

    try:
        ev.info_file_exists = _info_file_exists(ev)
    except Exception:
        ev.info_file_exists = False

    try:
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
    except Exception:
        logger.exception("Unhandled error in event_register for slug=%s", slug)
        return _render_service_unavailable(request)

def payment_mock(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        reg = None
    if reg is None:
        return render(request, "events/info_message.html", {"title": "Оплата", "message": "Регистрация не найдена."})

    try:
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
    except Exception:
        logger.exception("Unhandled error in payment_mock for reg_id=%s", reg_id)
        return _render_service_unavailable(request)

def test_view(request, reg_id):
    try:
        reg = Registration.objects.get(id=reg_id)
        ev = reg.event
    except (Registration.DoesNotExist, OperationalError, ProgrammingError):
        return HttpResponseForbidden("Тест недоступен.")
    try:
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
    except Exception:
        logger.exception("Unhandled error in test_view for reg_id=%s", reg_id)
        return _render_service_unavailable(request)

def search_api(request):
    q = request.GET.get("q", "").strip()
    results = []
    try:
        if q:
            for ev in Event.objects.filter(is_published=True, title__icontains=q).order_by("sort_order")[:10]:
                results.append({"title": ev.title, "url": ev.get_absolute_url()})
    except (OperationalError, ProgrammingError):
        pass
    except Exception:
        logger.exception("Unhandled error in search_api")
    return JsonResponse({"results": results})

@user_passes_test(lambda u: u.is_staff)
def export_csv_view(request):
    try:
        return export_registrations_csv()
    except Exception:
        logger.exception("export_csv_view failed")
        return _render_service_unavailable(request)

def event_list(request, slug=None):
    try:
        events = []
        category = None
        try:
            qs = Event.objects.filter(is_published=True)
            if slug and Category is not None:
                # only attempt to filter by category if model exists
                try:
                    category = Category.objects.get(slug=slug)
                    qs = qs.filter(category=category)
                except Category.DoesNotExist:
                    raise Http404("Category not found")
            elif slug and Category is None:
                logger.warning("Category model is not present, ignoring slug=%s", slug)
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
    except Http404:
        raise
    except Exception:
        logger.exception("Unhandled error in event_list slug=%s", slug)
        return _render_service_unavailable(request)

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
            logger.exception("Failed to stream file from storage for %s", name)

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
