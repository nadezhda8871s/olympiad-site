from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError

def home(request):
    """Главная: показывает хиро/поиск/кнопки + подборку избранных мероприятий.
    Никаких запросов к несуществующим таблицам на свежем деплое.
    """
    featured = []
    try:
        from events.models import Event  # импорт внутри, чтобы не падать, если модели нет
        featured = (
            Event.objects.filter(is_published=True, is_featured=True)
            .order_by("sort_order", "-id")[:12]
        )
    except (OperationalError, ProgrammingError, Exception):
        featured = []
    return render(request, "pages/home.html", {"featured_events": featured})

def about(request):
    """Статичная страница «О нас» (контент — в шаблоне)."""
    return render(request, "pages/about.html")
