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
