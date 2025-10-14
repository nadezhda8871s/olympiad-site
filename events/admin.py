from django.contrib import admin, messages
from .models import Event

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "is_published", "is_featured", "updated_at")
    list_filter = ("is_published", "is_featured")
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}

    def delete_model(self, request, obj):
        try:
            super().delete_model(request, obj)
        except Exception as e:
            messages.error(request, f"Не удалось удалить мероприятие: {e}")

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            try:
                obj.delete()
            except Exception as e:
                messages.error(request, f"Не удалось удалить «{obj}»: {e}")
