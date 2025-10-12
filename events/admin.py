from django.contrib import admin
from .models import Event, Registration, Payment, Question, AnswerOption, TestResult

class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 2

class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "price_rub", "is_published", "is_featured", "sort_order")
    list_filter = ("type", "is_published", "is_featured")
    search_fields = ("title",)
    inlines = [QuestionInline]

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
