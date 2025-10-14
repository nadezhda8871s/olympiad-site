from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError

def home(request):
    featured = []
    try:
        from events.models import Event
        featured = Event.objects.filter(is_published=True, is_featured=True).order_by("sort_order", "-id")[:12]
    except (OperationalError, ProgrammingError):
        pass
    return render(request, "pages/home.html", {"featured_events": featured})

def about(request):
    from .models import AboutPage
    try:
        obj = AboutPage.objects.first()
    except (OperationalError, ProgrammingError):
        obj = None
    return render(request, "pages/about.html", {"about": obj})
    # --- ABOUT (show text from admin; only this nuance is changed) ---
from django.apps import apps
from django.db.utils import OperationalError, ProgrammingError

def about(request):
    """Страница «О нас»: берём последнюю запись AboutPage БЕЗ фильтров публикации.
    Это гарантирует показ текста из админки, даже если не проставлены флаги published/active.
    Внешний вид не меняем — только подстановка контента."""
    page = None
    try:
        Model = apps.get_model("pages", "AboutPage")
    except Exception:
        Model = None

    if Model:
        try:
            qs = Model.objects.all()
            # Самая свежая запись: по updated_at (если есть), иначе по id
            if hasattr(Model, "updated_at"):
                qs = qs.order_by("-updated_at")
            else:
                qs = qs.order_by("-id")
            page = qs.first()
        except (OperationalError, ProgrammingError, Exception):
            page = None

    return render(request, "pages/about.html", {"page": page})

