from django.shortcuts import render
from django.db.models import Q
from django.db.utils import OperationalError, ProgrammingError

def _safe_events(filter_q=None):
    try:
        from .models import Event
    except Exception:
        return []
    try:
        qs = Event.objects.all()
        if hasattr(Event, "is_published"):
            qs = qs.filter(is_published=True)
        if filter_q is not None:
            qs = qs.filter(filter_q)
        if hasattr(Event, "sort_order"):
            qs = qs.order_by("sort_order", "-id")
        else:
            qs = qs.order_by("-id")
        return list(qs)
    except (OperationalError, ProgrammingError, Exception):
        return []

def olympiads(request):
    q = None
    try:
        from .models import Event
        if hasattr(Event, "category"):
            q = Q(category__iexact="olympiad") | Q(category__iexact="olympiads") | Q(category__icontains="олимпи")
    except Exception:
        q = None
    events = _safe_events(q)
    return render(request, "events/olympiads.html", {"events": events, "title": "Олимпиады"})

def contests(request):
    q = None
    try:
        from .models import Event
        if hasattr(Event, "category"):
            q = Q(category__iexact="contest") | Q(category__icontains="конкурс")
    except Exception:
        q = None
    events = _safe_events(q)
    return render(request, "events/contests.html", {"events": events, "title": "Конкурсы"})

def conferences(request):
    q = None
    try:
        from .models import Event
        if hasattr(Event, "category"):
            q = Q(category__iexact="conference") | Q(category__icontains="конференц")
    except Exception:
        q = None
    events = _safe_events(q)
    return render(request, "events/conferences.html", {"events": events, "title": "Конференции"})
