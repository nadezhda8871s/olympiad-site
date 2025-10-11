from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create admin with fixed credentials (use only in dev!)"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = "nadezhda8871s"
        email = "vsemnayka@gmail.com"
        password = "1988naNA"
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS("Admin user created."))
        else:
            self.stdout.write(self.style.WARNING("Admin user already exists."))
