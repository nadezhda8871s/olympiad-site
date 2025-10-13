from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError

def home(request):
    featured = []
    try:
        from events.models import Event
        featured = (
            Event.objects
            .filter(is_published=True, is_featured=True)
            .order_by("sort_order", "-id")[:12]
        )
    except (OperationalError, ProgrammingError, Exception):
        featured = []
    return render(request, "pages/home.html", {"featured_events": featured})

def about(request):
    page = None
    # Сохраняем функционал: если в проекте есть модель AboutPage — используем её.
    try:
        # Импортируем только внутри, чтобы не падать, если модели нет
        from .models import AboutPage  # noqa
        try:
            page = AboutPage.objects.first()
        except (OperationalError, ProgrammingError):
            page = None
    except Exception:
        page = None

    # Никаких внешних зависимостей; если page нет — просто отрисуем шаблон как статическую страницу.
    ctx = {"page": page}
    return render(request, "pages/about.html", ctx)
