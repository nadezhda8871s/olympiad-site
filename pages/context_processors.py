from django.db.utils import OperationalError, ProgrammingError
from .models import SiteSettings

def site_settings(request):
    try:
        return {"SITE_SETTINGS": SiteSettings.objects.first()}
    except (OperationalError, ProgrammingError):
        return {"SITE_SETTINGS": None}
