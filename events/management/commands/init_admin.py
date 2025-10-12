from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Создаёт администратора: nadezhda8871s / 1988naNA (если не существует)."

    def handle(self, *args, **options):
        User = get_user_model()
        username = "nadezhda8871s"
        password = "1988naNA"
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email="", password=password)
            self.stdout.write(self.style.SUCCESS("Создан админ-пользователь."))
        else:
            self.stdout.write("Админ-пользователь уже существует.")
