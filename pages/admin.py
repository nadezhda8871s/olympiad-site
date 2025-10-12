from django.contrib import admin
from .models import AboutPage, SiteSettings

@admin.register(AboutPage)
class AboutPageAdmin(admin.ModelAdmin):
    list_display = ("id", "updated_at")

@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("id",)
