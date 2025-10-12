from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path

# Simple health check for Render
def healthz(request):
    return HttpResponse("ok", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz),
    path("healthz/", healthz),
]

# Safely include app urls if they exist, without risking recursion
def safe_include(module_name, route, namespace=None):
    """
    Tries to include `module_name` if importable and not pointing back to this module.
    Avoids accidental recursion like include('config.urls') -> include('config.urls')...
    """
    import importlib
    try:
        mod = importlib.import_module(module_name)
        # Basic guard: don't include self
        if mod.__name__ == __name__:
            return
        # Compose include tuple to allow namespace safely
        inc = (module_name, namespace or module_name.split(".")[0])
        urlpatterns.append(path(route, include(inc, namespace=inc[1])))
    except Exception:
        # silence if module missing or invalid, keeps site bootable
        pass

# Common app mounts (adjust to your project apps; safe if missing)
safe_include("pages.urls", "", namespace="pages")
safe_include("events.urls", "events/", namespace="events")
safe_include("conferences.urls", "conferences/", namespace="conferences")
safe_include("blog.urls", "blog/", namespace="blog")
