# events/apps.py
from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        """
        Совместимость со старыми шаблонами/кодом без правок моделей и миграций.
        Делает два безопасных алиаса:
          - ev.info_letter        -> безопасный прокси ev.info_file, у которого есть .url даже если файла нет
          - ev.get_registration_url() -> корректная ссылка регистрации (или '#' если роут не найден)
        """

        # Локальный импорт, чтобы не ломать старт при миграциях
        try:
            from .models import Event
        except Exception:
            return

        # ---------- Безопасный прокси для файлового поля ----------
        class _SafeFileProxy:
            """
            Обёртка над FieldFile:
              - bool(proxy) == bool(фактического файла)
              - proxy.url    -> реальный url, а если его нет/ошибка — '#'
              - любые другие атрибуты аккуратно делегируются, не роняя шаблон
            """
            __slots__ = ("_f",)

            def __init__(self, fieldfile):
                self._f = fieldfile

            def __bool__(self):
                try:
                    return bool(self._f and getattr(self._f, "name", None))
                except Exception:
                    return False

            # Для Django шаблонов тоже важно truthiness через __len__
            def __len__(self):
                return 1 if bool(self) else 0

            @property
            def url(self):
                try:
                    if self._f and hasattr(self._f, "url"):
                        return self._f.url
                except Exception:
                    pass
                return "#"

            def __getattr__(self, item):
                # Делегируем остальные атрибуты безопасно
                try:
                    return getattr(self._f, item)
                except Exception:
                    # Возвращаем «пустые» значения, чтобы не падать в шаблонах
                    if item in ("name", "path"):
                        return ""
                    raise AttributeError(item)

        # ---------- Алиас поля: info_letter -> info_file (через безопасный прокси) ----------
        if not hasattr(Event, "info_letter"):
            @property
            def info_letter(self):
                try:
                    f = getattr(self, "info_file", None)
                except Exception:
                    f = None
                return _SafeFileProxy(f)

            Event.info_letter = info_letter

        # ---------- Алиас метода: get_registration_url() ----------
        # Важно: именно МЕТОД (callable), чтобы не ломать админку и сторонний код.
        if not hasattr(Event, "get_registration_url"):
            def get_registration_url(self):
                # Если есть современный метод — используем его
                if hasattr(self, "get_register_url"):
                    try:
                        url = self.get_register_url()
                        if url:
                            return url
                    except Exception:
                        pass

                # Пробуем распространённые имена urlpattern
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
