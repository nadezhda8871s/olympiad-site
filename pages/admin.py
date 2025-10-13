from django.contrib import admin
from .models import AboutPage, SiteSettings

@admin.register(AboutPage)
class AboutPageAdmin(admin.ModelAdmin):
    list_display = ('id', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('content_ru', 'content_en')
        }),
        ('Документы', {
            'fields': ('privacy_doc', 'oferta_doc')
        }),
    )

@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("id",)
