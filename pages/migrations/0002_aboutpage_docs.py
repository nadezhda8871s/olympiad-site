
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='aboutpage',
            name='privacy_doc',
            field=models.FileField(upload_to='about/', blank=True, null=True, verbose_name='Политика конфиденциальности (DOC/DOCX)'),
        ),
        migrations.AddField(
            model_name='aboutpage',
            name='oferta_doc',
            field=models.FileField(upload_to='about/', blank=True, null=True, verbose_name='Публичная оферта (DOC/DOCX)'),
        ),
    ]
