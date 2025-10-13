# events/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.db.utils import OperationalError, ProgrammingError

from .models import Event, Registration, Payment, Question, AnswerOption, TestResult
from .forms import RegistrationForm


# ===== ВСПОМОГАТЕЛЬНЫЕ БЕЗОПАСНЫЕ ОБЁРТКИ =====

class _SafeFileProxy:
    """
    Обёртка над FieldFile:
      - bool(proxy) == bool(реального файла)
      - proxy.url   -> реальный url, а если его нет/ошибка — '#'
      - остальные атрибуты делегируются безопасно
    """
    __slots__ = ("_f",)

    def __init__(self, fieldfile):
        self._f = fieldfile

    def __bool__(self):
        try:
            return bool(self._f and getattr(self._f, "name", None))
        except Exception:
            return False

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
        try:
            return getattr(self._f, item)
        except Exception:
            if item in ("name", "path"):
                return ""
            raise AttributeError(item)


class _SafeEvent:
    """
    Прокси мероприятия для шаблонов:
      - ev.info_letter.url безопасен (даже если файла нет)
      - ev.get_registration_url() доступен как МЕТОД, возвращает корректный путь или '#'
      - остальные атрибуты делегируются к исходной модели.
    """
    __slots__ = ("_ev", "info_letter")

    def __init__(self, ev: Event):
        self._ev = ev
        # старое имя поля — через безопасный прокси
        self.info_letter = _SafeFileProxy(getattr(ev, "info_file", None))

    # ---- делегирование базовых полей/свойств ----
    def __getattr__(self, item):
        return getattr(self._ev, item)

    # ---- совместимость со старыми шаблонами: метод, а не property ----
    def get_registration_url(self):
        # если есть современный метод — используем
        if hasattr(self._ev, "get_register_url"):
            try:
                url = self._ev.get_register_url()
                if url:
                    return url
            except Exception:
                pass

        # пробуем распространённые имена urlpattern
        try:
            from django.urls import reverse
            slug = getattr(self._ev, "slug", "")
            for name in ("event_register", "events:register", "register"):
                try:
                    return reverse(name, kwargs={"slug": slug})
                except Exception:
                    continue
        except Exception:
            pass
        return "#"


# ===== ОБЩИЙ РЕНДЕР СПИСКА =====

def _safe_list_by_type(request, type_code, title):
    """
    Строит список мероприятий нужного типа и оборачивает каждый объект
    в _SafeEven_
