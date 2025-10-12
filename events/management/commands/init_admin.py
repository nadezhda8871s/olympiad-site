
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create or update the superuser with fixed credentials for deployment."

    def handle(self, *args, **options):
        User = get_user_model()
        username = "nadezhda8871s"
        email = "vsemnayka@gmail.com"
        password = "1988naNA"
        user, created = User.objects.get_or_create(username=username, defaults={"email": email})
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' {'created' if created else 'updated'}."))
