from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Create superuser if it does not exist'

    def handle(self, *args, **options):
        username = config('ADMIN_USERNAME', default='admin')
        email = config('ADMIN_EMAIL', default='admin@example.com')
        password = config('ADMIN_PASSWORD', default='changeme123')

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Superuser "{username}" already exists')
            )
            return

        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'Superuser "{username}" created successfully')
            )
            logger.info(f'Superuser "{username}" created')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating superuser: {str(e)}')
            )
            logger.error(f'Error creating superuser: {str(e)}')
