from django.contrib import admin
from .models import Event, Registration, Payment, Question, AnswerOption, TestResult

class AnswerInline(admin.TabularInline):
    model = AnswerOption
    extra = 4

class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    list_display = ("event", "order")
    ordering = ("event", "order")

class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "price_rub", "is_published", "is_featured", "sort_order")
    list_filter = ("type", "is_published", "is_featured")
    search_fields = ("title",)
    prepopulated_fields = {"slug": ("title",)}

admin.site.register(Event, EventAdmin)
admin.site.register(Registration)
admin.site.register(Payment)
admin.site.register(Question, QuestionAdmin)
admin.site.register(AnswerOption)
admin.site.register(TestResult)
