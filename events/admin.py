from django import forms
from django.contrib import admin
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
        if self.instance and self.instance.pk:
            opts = list(self.instance.options.order_by("order")[:4])
            for i in range(1, 5):
                opt = next((o for o in opts if o.order == i), None)
                if opt:
                    self.fields[f"option_{i}"].initial = opt.text
                    if opt.is_correct:
                        self.fields["correct_option"].initial = str(i)

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
            if obj is None or getattr(obj, "type", None) == Event.EventType.OLYMPIAD:
                instances.append(inline_class(self.model, self.admin_site))
        return instances

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        # удалённые
        for obj in formset.deleted_objects:
            obj.delete()

        for f in formset.forms:
            if not hasattr(f, "cleaned_data"):
                continue
            if not f.cleaned_data or not f.cleaned_data.get("text"):
                if f.instance and f.instance.pk and f.cleaned_data.get("DELETE"):
                    f.instance.delete()
                continue

            q = f.save(commit=False)
            q.event = form.instance
            q.save()

            texts = [f.cleaned_data.get(f"option_{i}", "").strip() for i in range(1,5)]
            correct = f.cleaned_data.get("correct_option") or ""
            existing = {opt.order: opt for opt in q.options.all()}

            for i, txt in enumerate(texts, start=1):
                if not txt:
                    if i in existing:
                        existing[i].delete()
                    continue
                opt = existing.get(i) or AnswerOption(question=q, order=i)
                opt.text = txt
                opt.is_correct = (str(correct) == str(i))
                opt.save()

            for opt in q.options.exclude(order__in=[1,2,3,4]):
                if opt.is_correct:
                    opt.is_correct = False
                    opt.save(update_fields=["is_correct"])

        formset.save_m2m()

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
