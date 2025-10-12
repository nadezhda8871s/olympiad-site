from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Создаёт/обновляет администратора: nadezhda8871s / 1988naNA"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = "nadezhda8871s"
        password = "1988naNA"
        user, created = User.objects.get_or_create(username=username, defaults={"is_staff": True, "is_superuser": True})
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS("OK: admin nadezhda8871s / 1988naNA готов"))
