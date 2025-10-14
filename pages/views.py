from django.shortcuts import render
from django.db.utils import OperationalError, ProgrammingError

from django.conf import settings

def _legal_files_context():
    offer = getattr(settings, "OFFER_FILE_URL", None)
    privacy = getattr(settings, "PRIVACY_FILE_URL", None)
    ctx = {}
    if offer:
        class _Obj: pass
        o = _Obj(); o.url = offer
        ctx["offer_file"] = o
    if privacy:
        class _Obj: pass
        p = _Obj(); p.url = privacy
        ctx["privacy_file"] = p
    return ctx

def home(request):
    featured = []
    try:
        from events.models import Event
        featured = Event.objects.filter(is_published=True, is_featured=True).order_by("sort_order", "-id")[:12]
    except (OperationalError, ProgrammingError):
        pass
    return render(request, "pages/home.html", {"featured_events": featured})

def about(request):
    """Static About page; content is in the template."""
    return render(request, "pages/about.html")
