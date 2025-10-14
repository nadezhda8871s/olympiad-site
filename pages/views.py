from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError
from django.apps import apps

def home(request):
    featured = []
    try:
        from events.models import Event
        featured = (
            Event.objects
            .filter(is_published=True, is_featured=True)
            .order_by("sort_order", "-id")[:12]
        )
    except Exception:
        featured = []
    return render(request, "pages/home.html", {"featured_events": featured})

def about(request):
    page = None
    Model = None
    try:
        Model = apps.get_model("pages", "AboutPage")
    except Exception:
        Model = None
    if Model:
        try:
            qs = Model.objects.all()
            for flag in ("is_published", "published", "active", "is_active"):
                if hasattr(Model, flag):
                    qs = qs.filter(**{flag: True})
                    break
            if hasattr(Model, "updated_at"):
                qs = qs.order_by("-updated_at")
            page = qs.first()
        except (OperationalError, ProgrammingError, Exception):
            page = None
    return render(request, "pages/about.html", {"page": page})
