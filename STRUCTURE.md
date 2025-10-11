# Схема размещения файлов (кратко)

```
repo/
├─ README.md
├─ STRUCTURE.md
├─ requirements.txt
├─ .env.example
├─ .gitignore
├─ .editorconfig
├─ .pre-commit-config.yaml
├─ .github/workflows/ci.yml
├─ manage.py
├─ config/
│  ├─ __init__.py
│  ├─ urls.py
│  ├─ wsgi.py
│  ├─ asgi.py
│  └─ settings/
│     ├─ __init__.py
│     ├─ base.py
│     ├─ dev.py
│     └─ prod.py
├─ events/
│  ├─ __init__.py
│  ├─ admin.py
│  ├─ apps.py
│  ├─ models.py
│  ├─ forms.py
│  ├─ urls.py
│  ├─ views.py
│  ├─ services/
│  │  ├─ payments_mock.py
│  │  ├─ mailer.py
│  │  └─ export_csv.py
│  ├─ migrations/
│  └─ templates/events/
│     ├─ base.html
│     ├─ home.html
│     ├─ list.html           # список мероприятий по разделам
│     ├─ detail.html         # карточка мероприятия
│     ├─ register.html       # анкета
│     ├─ pay_choice.html     # выбор успех/ошибка
│     ├─ pay_success.html
│     ├─ pay_fail.html
│     ├─ test_start.html
│     └─ test_run.html
├─ pages/
│  ├─ __init__.py
│  ├─ urls.py
│  ├─ views.py
│  └─ templates/pages/
│     └─ about.html
├─ locale/
│  ├─ ru/LC_MESSAGES/django.po
│  └─ en/LC_MESSAGES/django.po
├─ static/
│  └─ (общие стили/иконки/контуры)
├─ media/
│  └─ (загрузки: инф.письма, файлы футера)
└─ seed/
   └─ footer_docs/
      ├─ Оферта.docx
      └─ Политика конфиденциальности.docx
```
