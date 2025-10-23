# Олимпиады / Конкурсы / Конференции — Django (Render-ready)

...

- **Env vars**: `PYTHON_VERSION=3.12.3`, `DJANGO_SETTINGS_MODULE=config.settings.prod`, `DJANGO_DEBUG=False`,
  `ALLOWED_HOSTS=<ваш_домен>.onrender.com`, почтовые (Gmail), `YOOKASSA_TEST_MODE=True`.

YooKassa integration
- Установите в панели YooKassa (merchant) необходимые ключи и включите вебхуки на URL: https://<ваш-домен>/payments/yookassa/notify/
- Задайте переменные окружения: YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY (see env.example).
- Для тестирования локально используйте sandbox-ключи и туннель (ngrok) для вебхуков.
