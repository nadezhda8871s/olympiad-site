# events/apps.py
from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        """
        Бесшовная совместимость со старыми шаблонами:
        - ev.info_letter  -> ev.info_file
        - ev.get_registration_url -> ev.get_register_url
        Делаем это один раз при старте приложения, без миграций и правок шаблонов.
        """
        try:
            from .models import Event  # импортируем модель после инициализации приложений
        except Exception:
            # Если по какой-то причине модели ещё не готовы (миграции и т.п.) — просто выходим.
            return

        # 1) Старое имя метода: get_registration_url
        if not hasattr(Event, "get_registration_url"):
            def get_registration_url(self):
                # Если есть современный метод — используем его.
                if hasattr(self, "get_register_url"):
                    return self.get_register_url()
                # Фолбэк на случай нестандартного кода.
                from django.urls import reverse
                return reverse("event_register", kwargs={"slug": getattr(self, "slug", "")})
            Event.get_registration_url = get_registration_url

        # 2) Старое имя поля: info_letter
        if not hasattr(Event, "info_letter"):
            # Делаем property, чтобы в шаблоне работало ev.info_letter.url
            @property
            def info_letter(self):
                return getattr(self, "info_file", None)
            Event.info_letter = info_letter
