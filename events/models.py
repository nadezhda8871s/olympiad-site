from django.db import models
from django.urls import reverse

class Event(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    short_description = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "-id")

    def __str__(self):
        return self.title or f"Событие #{self.pk}"

    def get_absolute_url(self):
        try:
            return reverse("events:detail", kwargs={"slug": self.slug})
        except Exception:
            # не ломаем админку/шаблоны, если именованный URL другой
            return f"/events/{self.slug}/"
