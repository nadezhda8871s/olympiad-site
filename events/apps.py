# events/apps.py
from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        """
        Бесшовная совместимость со старыми шаблонами/кодом БЕЗ правок моделей и миграций.
        Делает два безопасных алиаса:
        - ev.info_letter  -> ev.info_file (или None, если пусто)
        - ev.get_registration_url() -> даёт рабочую ссылку регистрации, либо '#' если route не найден
        """
        try:
            from .models import Event  # импорт после инициализации приложений
        except Exception:
            # Если модели ещё недоступны (миграции / старт) — тихо выходим.
            return

        # --- 1) Алиас поля: info_letter -> info_file ---
        if not hasattr(Event, "info_letter"):
            @property
            def info_letter(self):
                """
                Совместимость со старыми шаблонами: ev.info_letter.
                Возвращает FieldFile либо None, чтобы в шаблоне {% if ev.info_letter %} было безопасно.
                """
                try:
                    f = getattr(self, "info_file", None)
                    # Если поле не задано или пустое — None
                    if not f:
                        return None
                    # Для корректной работы в шаблонах (доступ к .url) оставляем сам FieldFile
                    return f
                except Exception:
                    return None

            Event.info_letter = info_letter

        # --- 2) Алиас метода: get_registration_url() -> рабочая ссылка/фолбэк ---
        # Важно: именно МЕТОД, не @property (админка ожидает callable).
        if not hasattr(Event, "get_registration_url"):
            def get_registration_url(self):
                """
                Совместимость: старые шаблоны дергают ev.get_registration_url.
                Пробуем несколько имён urlpattern; если ни одно не найдено — возвращаем '#', чтобы не уронить страницу.
                """
                # Если в модели уже есть современный метод — используем его.
                if hasattr(self, "get_register_url"):
                    try:
                        url = self.get_register_url()
                        if url:
                            return url
                    except Exception:
                        pass

                # Пробуем разные имена маршрутов, которые могли быть в проекте
                try:
                    from django.urls import reverse
                except Exception:
                    return "#"

                candidates = [
                    ("event_register", {"slug": getattr(self, "slug", "")}),
                    ("events:register", {"slug": getattr(self, "slug", "")}),
                    ("register", {"slug": getattr(self, "slug", "")}),
                ]
                for name, kwargs in candidates:
                    try:
                        return reverse(name, kwargs=kwargs)
                    except Exception:
                        continue
                return "#"

            Event.get_registration_url = get_registration_url
