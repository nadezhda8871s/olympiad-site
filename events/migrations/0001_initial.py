from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255, verbose_name="Заголовок")),
                ("title_en", models.CharField(blank=True, max_length=255, verbose_name="Заголовок (EN)")),
                ("description", models.TextField(blank=True, verbose_name="Описание")),
                ("description_en", models.TextField(blank=True, verbose_name="Описание (EN)")),
                ("type", models.CharField(choices=[("olymp", "Олимпиада"), ("contest", "Конкурс"), ("conference", "Конференция")], max_length=20, verbose_name="Тип")),
                ("price_rub", models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name="Стоимость, ₽")),
                ("info_file", models.FileField(blank=True, null=True, upload_to="info_letters/", verbose_name="Информационное письмо")),
                ("is_featured", models.BooleanField(default=False, verbose_name="Актуальное")),
                ("is_published", models.BooleanField(default=True, verbose_name="Опубликовано")),
                ("sort_order", models.IntegerField(default=0, verbose_name="Порядок")),
                ("event_date", models.DateField(blank=True, null=True, verbose_name="Дата проведения")),
                ("registration_deadline", models.DateField(blank=True, null=True, verbose_name="Дедлайн регистрации")),
                ("slug", models.SlugField(blank=True, max_length=255, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Мероприятие", "verbose_name_plural": "Мероприятия", "ordering": ["sort_order", "-id"]},
        ),
        migrations.CreateModel(
            name="Registration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fio", models.CharField(max_length=255)),
                ("org", models.CharField(max_length=255, verbose_name="Учебное заведение")),
                ("city", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(max_length=64)),
                ("consent_pd", models.BooleanField(default=False, verbose_name="Согласие на обработку ПДн")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="registrations", to="events.event")),
            ],
            options={"verbose_name": "Регистрация", "verbose_name_plural": "Регистрации"},
        ),
        migrations.CreateModel(
            name="Question",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField(verbose_name="Вопрос")),
                ("text_en", models.TextField(blank=True, verbose_name="Вопрос (EN)")),
                ("order", models.IntegerField(default=0)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="questions", to="events.event")),
            ],
            options={"verbose_name": "Вопрос", "verbose_name_plural": "Вопросы", "ordering": ["order", "id"]},
        ),
        migrations.CreateModel(
            name="AnswerOption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.CharField(max_length=500, verbose_name="Вариант")),
                ("text_en", models.CharField(blank=True, max_length=500, verbose_name="Вариант (EN)")),
                ("is_correct", models.BooleanField(default=False)),
                ("order", models.IntegerField(default=0)),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="options", to="events.question")),
            ],
            options={"verbose_name": "Вариант ответа", "verbose_name_plural": "Варианты ответа", "ordering": ["order", "id"]},
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Ожидает"), ("paid", "Оплачено"), ("failed", "Ошибка")], default="pending", max_length=16)),
                ("txn_id", models.CharField(blank=True, max_length=64)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("registration", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payment", to="events.registration")),
            ],
            options={"verbose_name": "Оплата", "verbose_name_plural": "Оплаты"},
        ),
        migrations.CreateModel(
            name="TestResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("score", models.IntegerField(default=0)),
                ("answers", models.JSONField(blank=True, default=dict)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("registration", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="results", to="events.registration")),
            ],
            options={"verbose_name": "Результат теста", "verbose_name_plural": "Результаты теста"},
        ),
    ]
