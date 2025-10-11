from django.db import models

class Event(models.Model):
    TYPE_CHOICES = [
        ('olympiad', 'Олимпиада'),
        ('contest', 'Конкурс'),
        ('conference', 'Конференция'),
    ]
    title = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField()
    description_en = models.TextField(blank=True, default="")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    price_rub = models.PositiveIntegerField(default=0)
    info_file = models.FileField(upload_to="info_letters/", blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Registration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    fio = models.CharField(max_length=255)
    org = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    consent_pd = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class Payment(models.Model):
    STATUS_CHOICES = [('pending','pending'), ('paid','paid'), ('failed','failed')]
    registration = models.OneToOneField(Registration, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    txn_id = models.CharField(max_length=64, blank=True, default="")
    paid_at = models.DateTimeField(blank=True, null=True)

class Question(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    text = models.TextField()
    text_en = models.TextField(blank=True, default="")
    order = models.IntegerField(default=0)

class AnswerOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=255)
    text_en = models.CharField(max_length=255, blank=True, default="")
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

class TestResult(models.Model):
    registration = models.OneToOneField(Registration, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
