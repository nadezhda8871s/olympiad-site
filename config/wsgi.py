import os
import sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# --- Авто-миграции при старте (для SQLite на Render) ---
def _run_startup_tasks():
    try:
        from django.core.management import call_command
        # Выполняем миграции при запуске (можно отключить MIGRATE_ON_START=0)
        if str(os.getenv("MIGRATE_ON_START", "1")).lower() in {"1","true","yes","on"}:
            call_command("migrate", interactive=False, run_syncdb=True)
        # Создаём/обновляем суперпользователя (можно отключить INIT_ADMIN_ON_START=0)
        if str(os.getenv("INIT_ADMIN_ON_START", "1")).lower() in {"1","true","yes","on"}:
            try:
                call_command("init_admin")
            except Exception:
                # не критично
                pass
    except Exception as e:
        # Не валим приложение из-за ошибок старта
        import traceback
        traceback.print_exc(file=sys.stderr)

_run_startup_tasks()

application = get_wsgi_application()
