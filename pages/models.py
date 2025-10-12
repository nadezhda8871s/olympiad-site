from django.db import models
from django.utils.translation import gettext_lazy as _

class AboutPage(models.Model):
    content_ru = models.TextField(blank=True, verbose_name=_("Содержимое (RU)"))
    content_en = models.TextField(blank=True, verbose_name=_("Содержимое (EN)"))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Страница 'О нас'")
        verbose_name_plural = _("Страница 'О нас'")

    def __str__(self):
        return "О нас"

class SiteSettings(models.Model):
    offer_doc = models.FileField(upload_to="footer_docs/", blank=True, null=True, verbose_name=_("Оферта/Пользовательское соглашение"))
    privacy_doc = models.FileField(upload_to="footer_docs/", blank=True, null=True, verbose_name=_("Политика конфиденциальности"))

    class Meta:
        verbose_name = _("Настройки сайта (файлы футера)")
        verbose_name_plural = _("Настройки сайта (файлы футера)")

    def __str__(self):
        return "Настройки сайта"
