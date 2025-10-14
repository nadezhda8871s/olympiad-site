from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Event, Registration, Payment, Question, AnswerOption, TestResult

class QuestionInlineForm(forms.ModelForm):
    option_1 = forms.CharField(label="Вариант 1", required=False, max_length=500)
    option_2 = forms.CharField(label="Вариант 2", required=False, max_length=500)
    option_3 = forms.CharField(label="Вариант 3", required=False, max_length=500)
    option_4 = forms.CharField(label="Вариант 4", required=False, max_length=500)
    correct_option = forms.ChoiceField(
        label="Правильный вариант",
        choices=(("1","1"),("2","2"),("3","3"),("4","4")),
        required=False
    )

    class Meta:
        model = Question
        fields = ["text", "text_en", "order"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Бережно пытаемся прочитать существующие варианты, если они есть
        try:
            if self.instance and getattr(self.instance, "pk", None):
                opts_manager = getattr(self.instance, "options", None)
                if opts_manager is not None:
                    opts = list(opts_manager.order_by("order")[:4])
                else:
                    # Попытка получить связанный набор по стандартному имени
                    opts = list(self.instance.answeroption_set.order_by("order")[:4])
                for i in range(1, 5):
                    opt = next((o for o in opts if o.order == i), None)
                    if opt:
                        self.fields[f"option_{i}"].initial = opt.text
                        if getattr(opt, "is_correct", False):
                            self.fields["correct_option"].initial = str(i)
        except Exception:
            # Если что-то пошло не так — не ломаем загрузку формы; оставляем пустые поля
            pass

class QuestionInline(admin.StackedInline):
    model = Question
    form = QuestionInlineForm
    extra = 1
    show_change_link = True
    fieldsets = (
        (None, {"fields": ("text", "text_en", "order")}),
        ("Варианты ответа (до 4)", {"fields": ("option_1","option_2","option_3","option_4","correct_option")}),
    )

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "price_rub", "is_published", "is_featured", "sort_order")
    list_filter = ("type", "is_published", "is_featured")
    search_fields = ("title",)
    inlines = [QuestionInline]

    def get_inline_instances(self, request, obj=None):
        instances = []
        for inline_class in self.inlines:
            # показываем inline только для олимпиад (или при создании)
            if obj is None or getattr(obj, "type", None) == Event.EventType.OLYMPIAD:
                instances.append(inline_class(self.model, self.admin_site))
        return instances

    def save_formset(self, request, form, formset, change):
        """
        Бережно сохраняем вопрос/варианты из наших кастомных полей.
        В случае ошибок — добавляем non_form_error, чтобы Django показал ошибку в админке,
        а не вернул 400 без объяснения.
        """
        try:
            instances = formset.save(commit=False)
            # удалённые
            for obj in formset.deleted_objects:
                try:
                    obj.delete()
                except Exception:
                    pass

            for f in formset.forms:
                # Если форма невалидна — добавляем ошибку к formset и продолжим
                if not hasattr(f, "cleaned_data"):
                    continue
                if not f.is_valid():
                    # перенесём ошибки в non_form_errors, чтобы админ отобразил их
                    formset._non_form_errors = formset._non_form_errors + f.errors.as_data()
                    continue
                if not f.cleaned_data or not f.cleaned_data.get("text"):
                    if f.instance and getattr(f.instance, "pk", None) and f.cleaned_data.get("DELETE"):
                        try:
                            f.instance.delete()
                        except Exception:
                            pass
                    continue

                # Сохраняем вопрос
                q = f.save(commit=False)
                q.event = form.instance
                q.save()

                # Бережно обновляем/создаём варианты ответов
                texts = [f.cleaned_data.get(f"option_{i}", "").strip() for i in range(1,5)]
                correct = f.cleaned_data.get("correct_option") or ""
                # получаем существующие варианты через связанный менеджер
                existing_qs = AnswerOption.objects.filter(question=q)
                existing = {opt.order: opt for opt in existing_qs}

                for i, txt in enumerate(texts, start=1):
                    if not txt:
                        if i in existing:
                            try:
                                existing[i].delete()
                            except Exception:
                                pass
                        continue
                    opt = existing.get(i)
                    if not opt:
                        opt = AnswerOption(question=q, order=i)
                    opt.text = txt
                    opt.is_correct = (str(correct) == str(i))
                    opt.save()

                # Если у вопроса есть лишние варианты (>4), деактивируем флаг is_correct у них
                try:
                    for opt in AnswerOption.objects.filter(question=q).exclude(order__in=[1,2,3,4]):
                        if opt.is_correct:
                            opt.is_correct = False
                            opt.save(update_fields=["is_correct"])
                except Exception:
                    pass

            formset.save_m2m()
        except ValidationError as e:
            formset._non_form_errors = formset._non_form_errors + e.error_list
            raise
        except Exception as e:
            # Гарантируем, что ошибка будет видна в админке в виде неформовой ошибки
            formset._non_form_errors = formset._non_form_errors + [ValidationError(str(e))]
            raise
            

@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "event", "fio", "org", "city", "email", "phone")
    list_filter = ("event__type",)
    search_fields = ("fio", "email", "event__title")

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("registration", "status", "paid_at", "txn_id")
    list_filter = ("status",)

@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ("registration", "score", "started_at", "finished_at")
