# events/models.py
from django.db import models
from django.urls import reverse
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class Event(models.Model):
    class EventType(models.TextChoices):
        OLYMPIAD = "olymp", _("Олимпиада")
        CONTEST = "contest", _("Конкурс")
        CONFERENCE = "conference", _("Конференция")

    title = models.CharField(max_length=255, verbose_name=_("Заголовок"))
    title_en = models.CharField(max_length=255, blank=True, verbose_name=_("Заголовок (EN)"))
    short_description = models.CharField(max_length=500, blank=True, verbose_name=_("Краткое описание"))
    description = models.TextField(blank=True, verbose_name=_("Описание"))
    description_en = models.TextField(blank=True, verbose_name=_("Описание (EN)"))

    type = models.CharField(max_length=20, choices=EventType.choices, verbose_name=_("Тип"))
    event_date = models.DateField(blank=True, null=True, verbose_name=_("Дата проведения"))

    price_rub = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_("Стоимость, ₽"))

    # Единое поле файла
    info_file = models.FileField(upload_to="info_letters/", blank=True, null=True, verbose_name=_("Информационное письмо"))

    is_published = models.BooleanField(default=False, verbose_name=_("Опубликовано"))
    is_featured = models.BooleanField(default=False, verbose_name=_("Показывать на главной (актуальные)"))
    sort_order = models.PositiveIntegerField(default=0, verbose_name=_("Сортировка"))

    slug = models.SlugField(max_length=255, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "id")
        verbose_name = _("Мероприятие")
        verbose_name_plural = _("Мероприятия")

    def __str__(self):
        return self.title

    # Современный метод (как и прежде)
    def get_register_url(self) -> str:
        return reverse("event_register", kwargs={"slug": self.slug})

    # >>> ФИКС СОВМЕСТИМОСТИ (НЕ ЛОМАЕТ АДМИНКУ) <<<
    # Старое имя, ожидаемое в шаблонах/админке как МЕТОД.
    def get_registration_url(self) -> str:
        """
        Совместимость со старыми шаблонами/кодом.
        Делегирует в get_register_url(), чтобы не дублировать логику.
        """
        return self.get_register_url()

    # Старое имя поля — оставляем как property, это безопасно:
    @property
    def info_letter(self):
        """
        Совместимость: ev.info_letter -> ev.info_file
        В шаблоне можно обращаться к ev.info_letter и, если он есть,
        уже потом к ev.info_letter.url.
        """
        return self.info_file
    # <<< КОНЕЦ ФИКСА >>>

    def get_absolute_url(self) -> str:
        return reverse("event_detail", kwargs={"slug": self.slug})

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title or f"event-{timezone.now().date()}")
            candidate = base
            n = 2
            while Event.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base}-{n}"
                n += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class Registration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    fio = models.CharField(max_length=255, verbose_name=_("ФИО"))
    org = models.CharField(max_length=255, verbose_name=_("Учебное заведение"))
    city = models.CharField(max_length=255, verbose_name=_("Город"))
    email = models.EmailField(verbose_name=_("E-mail"))
    phone = models.CharField(max_length=50, verbose_name=_("Телефон"))
    consent_pd = models.BooleanField(default=False, verbose_name=_("Согласие на обработку ПД"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Регистрация")
        verbose_name_plural = _("Регистрации")

    def __str__(self):
        return f"{self.fio} — {self.event.title}"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("Ожидает")
        SUCCESS = "success", _("Оплачен")
        FAILED = "failed", _("Ошибка")

    registration = models.OneToOneField(Registration, on_delete=models.CASCADE, related_name="payment")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    txn_id = models.CharField(max_length=100, blank=True, default="")
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Платёж")
        verbose_name_plural = _("Платежи")

    def __str__(self):
        return f"{self.registration} — {self.get_status_display()}"


class Question(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField(verbose_name=_("Вопрос"))
    text_en = models.TextField(blank=True, verbose_name=_("Вопрос (EN)"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Порядок"))

    class Meta:
        ordering = ("order", "id")
        verbose_name = _("Вопрос")
        verbose_name_plural = _("Вопросы")

    def __str__(self):
        return self.text[:50]


class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=500, verbose_name=_("Вариант"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Порядок"))
    is_correct = models.BooleanField(default=False, verbose_name=_("Правильный"))

    class Meta:
        ordering = ("order", "id")
        verbose_name = _("Вариант ответа")
        verbose_name_plural = _("Варианты ответа")

    def __str__(self):
        return self.text[:50]


class TestResult(models.Model):
    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name="results")
    score = models.IntegerField(default=0)
    answers = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Результат теста")
        verbose_name_plural = _("Результаты теста")
