from django import forms

class RegistrationForm(forms.Form):
    fio = forms.CharField(label="ФИО", max_length=255)
    org = forms.CharField(label="Учебное заведение", max_length=255)
    city = forms.CharField(label="Город", max_length=255)
    email = forms.EmailField(label="E-mail")
    phone = forms.CharField(label="Телефон", max_length=50)
    consent_pd = forms.BooleanField(label="Согласие на обработку персональных данных")
