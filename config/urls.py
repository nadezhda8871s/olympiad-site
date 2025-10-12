
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("i18n/", include("django.conf.urls.i18n")),
]

# Attach app URLs with safe fallbacks to avoid ImportError and recursion mistakes.
# pages at root
try:
    urlpatterns += [path("", include("pages.urls"))]
except Exception:
    # Fallback: simple static template if pages.urls is absent during deploy
    urlpatterns += [path("", TemplateView.as_view(template_name="pages/home.html"), name="home")]
# events under /events/
try:
    urlpatterns += [path("events/", include("events.urls"))]
except Exception:
    pass
