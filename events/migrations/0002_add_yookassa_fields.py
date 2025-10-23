from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='yookassa_payment_id',
            field=models.CharField(max_length=128, null=True, blank=True, db_index=True, verbose_name='YooKassa payment id'),
        ),
        migrations.AddField(
            model_name='payment',
            name='payment_status',
            field=models.CharField(max_length=64, null=True, blank=True, verbose_name='Статус платежа'),
        ),
        migrations.AddField(
            model_name='payment',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]
