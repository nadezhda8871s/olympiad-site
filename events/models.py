from django.db import models
from django.urls import reverse
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

class Event(models.Model):
    class EventType(models.TextChoices):
        OLYMPIAD = "olymp", _("Олимпиада")
        CONTEST = "contest", _("Конкурс")
        CONFERENCE = "conference", _("Конференция")

    title = models.CharField(max_length=255, verbose_name=_("Заголовок"))
    title_en = models.CharField(max_length=255, blank=True, verbose_name=_("Заголовок (EN)"))
    description = models.TextField(blank=True, verbose_name=_("Описание"))
    description_en = models.TextField(blank=True, verbose_name=_("Описание (EN)"))
    type = models.CharField(max_length=20, choices=EventType.choices, verbose_name=_("Тип"))
    price_rub = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Стоимость, ₽"))
    info_file = models.FileField(upload_to="info_letters/", blank=True, null=True, verbose_name=_("Информационное письмо"))
    is_featured = models.BooleanField(default=False, verbose_name=_("Актуальное"))
    is_published = models.BooleanField(default=True, verbose_name=_("Опубликовано"))
    sort_order = models.IntegerField(default=0, verbose_name=_("Порядок"))
    event_date = models.DateField(blank=True, null=True, verbose_name=_("Дата проведения"))
    registration_deadline = models.DateField(blank=True, null=True, verbose_name=_("Дедлайн регистрации"))
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Мероприятие")
        verbose_name_plural = _("Мероприятия")
        ordering = ["sort_order", "-id"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:50]
            slug = base
            i = 1
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse("event_detail", args=[self.slug])

    @property
    def get_register_url(self):
        return reverse("event_register", args=[self.slug])

class Registration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    fio = models.CharField(max_length=255)
    org = models.CharField(max_length=255, verbose_name=_("Учебное заведение"))
    city = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=64)
    consent_pd = models.BooleanField(default=False, verbose_name=_("Согласие на обработку ПДн"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Регистрация")
        verbose_name_plural = _("Регистрации")

    def __str__(self):
        return f"{self.fio} — {self.event.title}"

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("Ожидает")
        PAID = "paid", _("Оплачено")
        FAILED = "failed", _("Ошибка")

    registration = models.OneToOneField(Registration, on_delete=models.CASCADE, related_name="payment")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    txn_id = models.CharField(max_length=64, blank=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Оплата")
        verbose_name_plural = _("Оплаты")

class Question(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField(verbose_name=_("Вопрос"))
    text_en = models.TextField(blank=True, verbose_name=_("Вопрос (EN)"))
    order = models.IntegerField(default=0)

    class Meta:
        verbose_name = _("Вопрос")
        verbose_name_plural = _("Вопросы")
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.event.title}: {self.text[:50]}"

class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500, verbose_name=_("Вариант"))
    text_en = models.CharField(max_length=500, blank=True, verbose_name=_("Вариант (EN)"))
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        verbose_name = _("Вариант ответа")
        verbose_name_plural = _("Варианты ответа")
        ordering = ["order", "id"]

    def __str__(self):
        return (self.text or "").strip()[:100] or f"Вариант #{self.pk}"

class TestResult(models.Model):
    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name="results")
    score = models.IntegerField(default=0)
    answers = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Результат теста")
        verbose_name_plural = _("Результаты теста")
