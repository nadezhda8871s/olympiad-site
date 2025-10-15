# -*- coding: utf-8 -*-
import os
import mimetypes
from urllib.parse import quote

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.views.decorators.http import require_GET

from .models import Event


@require_GET
def download_info_letter(request, pk):
    """
    Streams the attached info letter with a correct filename and content type.
    Prevents browsers from renaming it to .htm by setting explicit headers.
    """
    event = get_object_or_404(Event, pk=pk)
    # Support both field names (info_file and legacy info_letter)
    f = getattr(event, 'info_file', None) or getattr(event, 'info_letter', None)
    if not f:
        raise Http404("Информационное письмо не прикреплено.")

    filename = os.path.basename(f.name)
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    # Stream the file from storage
    response = FileResponse(f.open('rb'), content_type=content_type)

    # ASCII fallback + RFC 5987 UTF-8 filename
    name, ext = os.path.splitext(filename)
    fallback = f"{slugify(name) or 'info-letter'}{ext}"
    response['Content-Disposition'] = (
        f'attachment; filename="{fallback}"; filename*=UTF-8\'\'{quote(filename)}'
    )

    try:
        response['Content-Length'] = f.size
    except Exception:
        pass

    return response
