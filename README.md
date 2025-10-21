# Олимпиады / Конкурсы / Конференции — Django (Render-ready)

Готовый проект для деплоя на Render (Python). Включены:
- Белая раздача статики (WhiteNoise), `collectstatic` в билде
- Маршруты `/about/` и `/i18n/setlang/`
- Миграции приложений `pages` и `events` в репозитории
- Админ-пользователь создаётся автоматически (см. Build Command)

## Быстрый запуск локально

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

python manage.py migrate
python manage.py init_admin
python manage.py loaddata fixtures/sample_events.json  # опционально
python manage.py runserver
```

Админка: http://127.0.0.1:8000/admin  
Логин: `nadezhda8871s`  Пароль: `1988naNA`

## Render (новый сервис, тип Python)

- **Build Command**
```
pip install -r requirements.txt
python3 manage.py collectstatic --noinput
python3 manage.py migrate
python3 manage.py init_admin
```
- **Start Command**
```
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```
- **Env vars**: `PYTHON_VERSION=3.12.3`, `DJANGO_SETTINGS_MODULE=config.settings.prod`, `DJANGO_DEBUG=False`,
  `ALLOWED_HOSTS=<ваш_домен>.onrender.com`, почтовые (Gmail), `ROBOKASSA_DEMO=True`.
- **Disk**: Name `media`, Mount `/opt/render/project/src/media`.

Можно также задеплоить через `render.yaml` (см. корень).


## Оплата через ЮKassa

Добавлена интеграция с ЮKassa. Для работы задайте переменные окружения:

```env
YOOKASSA_SHOP_ID=1174287
YOOKASSA_SECRET_KEY=***
```

Страница успеха (return_url), которую нужно указать в личном кабинете ЮKassa:  
**`/pay/success/`** (полный адрес вида `https://<ваш-домен>/pay/success/`).

Вебхук (уведомления):  
**`/pay/webhook/`** (полный адрес вида `https://<ваш-домен>/pay/webhook/`).

При создании регистрации пользователь автоматически перенаправляется на оплату.
