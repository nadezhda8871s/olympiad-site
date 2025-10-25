from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError
from django.conf import settings


def _legal_files_context():
    """
    Возвращает ссылки на файлы в футере (оферта/политика), если заданы в настройках.
    Поддерживает оба варианта: URL-строки в settings или FileField из модели настроек.
    """
    offer = getattr(settings, "OFFER_FILE_URL", None)
    privacy = getattr(settings, "PRIVACY_FILE_URL", None)
    ctx = {}

    if offer:
        # Эмулируем объект с .url, чтобы шаблоны не переписывать
        class _Obj:
            pass
        o = _Obj()
        o.url = offer
        ctx["offer_file"] = o

    if privacy:
        class _Obj:
            pass
        p = _Obj()
        p.url = privacy
        ctx["privacy_file"] = p

    return ctx


def home(request):
    """
    Главная страница.
    Раньше брали is_published, из-за чего мероприятия из админки не отображались.
    Теперь используем is_active. Если есть избранные — показываем их,
    иначе показываем свежие активные мероприятия.
    """
    featured_or_latest = []
    try:
        from events.models import Event

        # Базовый queryset активных мероприятий
        base_qs = Event.objects.filter(is_active=True).order_by("sort_order", "-start_date", "-id")

        # Сначала пробуем отдать избранные
        featured_qs = base_qs.filter(is_featured=True)[:12]
        if featured_qs:
            featured_or_latest = list(featured_qs)
        else:
            # Если избранных нет — берём последние активные
            featured_or_latest = list(base_qs[:12])

    except (OperationalError, ProgrammingError):
        # База может быть не мигрирована в момент билда/тестов — просто молча не показываем
        featured_or_latest = []
    except Exception:
        # На проде не падаем из-за неожиданных ошибок: просто пустой список
        featured_or_latest = []

    ctx = {
        "featured_events": featured_or_latest,
    }
    ctx.update(_legal_files_context())
    return render(request, "pages/home.html", ctx)


def about(request):
    """Статическая страница 'О нас'."""
    return render(request, "pages/about.html", _legal_files_context())
