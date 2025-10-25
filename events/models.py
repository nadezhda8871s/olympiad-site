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

    class Meta:
        verbose_name = _("Мероприятие")
        verbose_name_plural = _("Мероприятия")
        ordering = ["sort_order", "-id"]

    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            base = slugify(self.title)[:50]
            slug = base
            i = 1
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        # Используем существующие имена из events/urls.py и pk
        return reverse("detail", args=[self.pk])

    @property
    def get_register_url(self):
        return reverse("register", args=[self.pk])

class Registration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    fio = models.CharField(max_length=255)
    org = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    payment_id = models.CharField(max_length=100, blank=True, default="")
    payment_status = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        verbose_name = _("Регистрация")
        verbose_name_plural = _("Регистрации")

    def __str__(self):
        return f"{self.fio} → {self.event}"

class Payment(models.Model):
    registration = models.OneToOneField(Registration, on_delete=models.CASCADE, related_name="payment")
    status = models.CharField(max_length=50, default="pending")
    paid_at = models.DateTimeField(blank=True, null=True)
    txn_id = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        verbose_name = _("Платёж")
        verbose_name_plural = _("Платежи")

    def __str__(self):
        return f"Платёж {self.txn_id} ({self.status})"

class Question(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()

    class Meta:
        verbose_name = _("Вопрос")
        verbose_name_plural = _("Вопросы")

    def __str__(self):
        return self.text[:60]

class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Вариант ответа")
        verbose_name_plural = _("Варианты ответов")

    def __str__(self):
        return self.text[:60]

class TestResult(models.Model):
    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name="results")
    score = models.IntegerField(default=0)
    answers = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Результат теста")
        verbose_name_plural = _("Результаты теста")
