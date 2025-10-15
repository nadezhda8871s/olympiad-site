# добавьте в начало файла (если ещё нет)
import os
import mimetypes
from django.http import FileResponse, Http404
from django.utils.encoding import smart_str

# ... существующий код ...

# добавьте где‑нибудь рядом с другими view функции:
def _info_file_physical_path(ev):
    """Попытка вернуть физический путь (если storage поддерживает path)."""
    try:
        if ev and ev.info_file and ev.info_file.name:
            # ev.info_file.path может бросать исключение для S3 backends
            return ev.info_file.path
    except Exception:
        return None
    return None

def event_info_download(request, slug):
    """
    Stream file to client using Django FileResponse as a robust fallback.
    Works with FileSystemStorage and with storages that implement .open() (S3 via django-storages).
    """
    try:
        ev = Event.objects.get(slug=slug, is_published=True)
    except Event.DoesNotExist:
        raise Http404("Мероприятие не найдено")

    # Проверяем наличие info_file в модели
    if not (getattr(ev, "info_file", None) and getattr(ev.info_file, "name", None)):
        raise Http404("Файл не найден")

    # Попытка через storage.exists (безопасно)
    try:
        storage = ev.info_file.storage
        name = ev.info_file.name
        try:
            is_present = storage.exists(name)
        except Exception:
            is_present = False
    except Exception:
        is_present = False

    # Если storage сообщает, что файл есть — открываем через storage.open
    if is_present:
        try:
            f = storage.open(name, mode="rb")
            # определяем content-type
            content_type, _ = mimetypes.guess_type(name)
            if not content_type:
                content_type = "application/octet-stream"
            response = FileResponse(f, content_type=content_type)
            filename = os.path.basename(name)
            response["Content-Disposition"] = f'attachment; filename="{smart_str(filename)}"'
            return response
        except Exception:
            # fallthrough — попробуем физический путь ниже
            pass

    # Если storage.exists == False или открытие провалилось, попробуем физический путь (если доступен)
    path = _info_file_physical_path(ev)
    if path:
        if os.path.exists(path):
            f = open(path, "rb")
            content_type, _ = mimetypes.guess_type(path)
            if not content_type:
                content_type = "application/octet-stream"
            response = FileResponse(f, content_type=content_type)
            filename = os.path.basename(path)
            response["Content-Disposition"] = f'attachment; filename="{smart_str(filename)}"'
            return response

    # Ничего не помогло — файл недоступен
    raise Http404("Файлы отсутствуют.")
