# Олимпиады, Конкурсы, Конференции — Научные мероприятия высокого уровня

Скелет Django-проекта с мультиязычностью (RU/EN), регистрациями, мок-оплатой, тестами для олимпиад,
и админкой `/admin` (логин: `nadezhda8871s`, пароль: `1988naNA` будет создан командой ниже).

## Быстрый старт (локально)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser --username nadezhda8871s --email vsemnayka@gmail.com
# или создайте автоматически:
python manage.py create_fixed_admin
python manage.py runserver
```

Откройте: http://127.0.0.1:8000/

## Структура
См. `STRUCTURE.md`

## Импорт документов в футер
Начальные файлы лежат в `seed/footer_docs/` (Оферта, Политика). Загрузите их через админку в раздел «Файлы в футере».

## Мок-оплата
Маршруты `/pay/<order_id>` показывают страницы имитации успешной/неуспешной оплаты.

## Локализация
Каталоги `locale/ru` и `locale/en` подготовлены; строки в шаблонах и вьюхах помечены для перевода.
