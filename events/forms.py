from django import forms
from .models import Registration

class RegistrationForm(forms.ModelForm):
    consent_pd = forms.BooleanField(required=True, label="Согласие на обработку персональных данных")

    class Meta:
        model = Registration
        fields = ["fio", "org", "city", "email", "phone", "consent_pd"]
        widgets = {
            "fio": forms.TextInput(attrs={"placeholder": "ФИО"}),
            "org": forms.TextInput(attrs={"placeholder": "Учебное заведение"}),
            "city": forms.TextInput(attrs={"placeholder": "Город"}),
            "email": forms.EmailInput(attrs={"placeholder": "E-mail"}),
            "phone": forms.TextInput(attrs={"placeholder": "Телефон"}),
        }
