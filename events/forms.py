from django import forms
from .models import Registration

class RegistrationForm(forms.ModelForm):
    consent_pd = forms.BooleanField(required=True, label="Согласие на обработку персональных данных")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["fio"].label = "Фамилия Имя Отчество"
        self.fields["org"].label = "Учебное заведение"
        self.fields["city"].label = "Город"
        self.fields["email"].label = "E-mail"
        self.fields["phone"].label = "Номер контактного телефона"

        # Красивые классы для выравнивания
        for name, field in self.fields.items():
            css = field.widget.attrs.get("class", "")
            field.widget.attrs["class"] = (css + " form-input").strip()

    class Meta:
        model = Registration
        fields = ["fio", "org", "city", "email", "phone", "consent_pd"]
        widgets = {
            "fio": forms.TextInput(attrs={"placeholder": "Фамилия Имя Отчество"}),
            "org": forms.TextInput(attrs={"placeholder": "Учебное заведение"}),
            "city": forms.TextInput(attrs={"placeholder": "Город"}),
            "email": forms.EmailInput(attrs={"placeholder": "E-mail"}),
            "phone": forms.TextInput(attrs={"placeholder": "Номер контактного телефона"}),
        }
