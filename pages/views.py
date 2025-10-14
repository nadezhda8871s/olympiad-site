from django.shortcuts import render
from django.apps import apps
from django.db.utils import OperationalError, ProgrammingError

def about(request):
    """Страница «О нас»: берём последнюю запись AboutPage БЕЗ фильтров публикации.
    Это гарантирует показ текста из админки, даже если не проставлены флаги published/active."""
    page = None
    try:
        Model = apps.get_model("pages", "AboutPage")
    except Exception:
        Model = None

    if Model:
        try:
            qs = Model.objects.all()
            # Показываем самую свежую запись (по updated_at если поле есть, иначе по id)
            if hasattr(Model, "updated_at"):
                qs = qs.order_by("-updated_at")
            else:
                qs = qs.order_by("-id")
            page = qs.first()
        except (OperationalError, ProgrammingError, Exception):
            page = None

    return render(request, "pages/about.html", {"page": page})
