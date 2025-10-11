from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AboutPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content_ru", models.TextField(blank=True, verbose_name="Содержимое (RU)")),
                ("content_en", models.TextField(blank=True, verbose_name="Содержимое (EN)")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Страница 'О нас'",
                "verbose_name_plural": "Страница 'О нас'",
            },
        ),
        migrations.CreateModel(
            name="SiteSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("offer_doc", models.FileField(blank=True, null=True, upload_to="footer_docs/", verbose_name="Оферта/Пользовательское соглашение")),
                ("privacy_doc", models.FileField(blank=True, null=True, upload_to="footer_docs/", verbose_name="Политика конфиденциальности")),
            ],
            options={
                "verbose_name": "Настройки сайта (файлы футера)",
                "verbose_name_plural": "Настройки сайта (файлы футера)",
            },
        ),
    ]
