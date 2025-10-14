from django.shortcuts import render
from django.apps import apps

def _get_about_record():
    AboutPage = apps.get_model('pages', 'AboutPage')
    try:
        return AboutPage.objects.order_by('-id').first()
    except Exception:
        return None

def _extract_about_fields(obj):
    if obj is None:
        return {"title": "", "body_html": ""}
    text_bits = []
    title_val = ""
    best_text = ""
    try:
        fields = obj._meta.get_fields()
    except Exception:
        fields = []
    for f in fields:
        name = getattr(f, 'name', '')
        attname = getattr(f, 'attname', name)
        try:
            val = getattr(obj, attname, None)
        except Exception:
            val = None

        # guess title
        if not title_val and name.lower() in ("title", "name", "heading", "headline"):
            if isinstance(val, str) and val.strip():
                title_val = val.strip()

        # detect text fields by type name
        it = getattr(f, 'get_internal_type', lambda: "")()
        if it in ("TextField", "CharField"):
            if isinstance(val, str) and val.strip():
                text_bits.append((name.lower(), val.strip()))

    preferred_order = ["body", "content", "text", "description", "rich_text", "about", "html"]
    for pref in preferred_order:
        for name, val in text_bits:
            if name == pref and len(val) > len(best_text):
                best_text = val
    if not best_text and text_bits:
        best_text = max(text_bits, key=lambda x: len(x[1]))[1]

    return {"title": title_val, "body_html": best_text}

def about(request):
    rec = _get_about_record()
    ctx = {"about": rec, "title": "", "body_html": ""}
    ctx.update(_extract_about_fields(rec))
    return render(request, "pages/about.html", ctx)

def home(request):
    # keep original behavior safe
    try:
        Event = apps.get_model('events', 'Event')
    except Exception:
        Event = None

    events = []
    if Event is not None:
        try:
            qs = Event.objects.all()
            if hasattr(Event, 'is_published'):
                qs = qs.filter(is_published=True)
            if hasattr(Event, 'is_featured'):
                qs = qs.filter(is_featured=True)
            events = list(qs.order_by("-id")[:12])
        except Exception:
            events = []
    return render(request, "pages/home.html", {"events": events})
