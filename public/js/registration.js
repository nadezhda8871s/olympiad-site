/* js/registration.js */
(function () {
  const form = document.getElementById('registration-form');
  if (!form) return;

  // Add supervisor field if missing
  if (!form.querySelector('#supervisor')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <label for="supervisor">ФИО Научного руководителя (преподавателя):</label>
      <input type="text" id="supervisor" name="supervisor" required>
    `;
    form.insertBefore(wrap, form.querySelector('button[type="submit"]'));
  }

  const success = document.getElementById('success-message');
  const errorBox = document.getElementById('error-message');
  const payBtn = document.getElementById('pay-button');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    const eventId = document.getElementById('event-id').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const name = document.getElementById('name').value.trim();
    const patronymic = (document.getElementById('patronymic')?.value || '').trim();
    const institution = document.getElementById('institution').value.trim();
    const country = document.getElementById('country').value.trim();
    const city = document.getElementById('city').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const supervisor = document.getElementById('supervisor').value.trim();

    const fullName = [surname, name, patronymic].filter(Boolean).join(' ');

    const r = await fetch('/api/events/' + encodeURIComponent(eventId) + '/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        fullName, email, city, country, phone,
        organization: institution, supervisor
      })
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) {
      errorBox.textContent = d.error || 'Ошибка при отправке формы';
      errorBox.style.display = 'block';
      return;
    }
    // Show next step
    form.style.display = 'none';
    success.style.display = 'block';
    if (payBtn && d.paymentUrl) {
      payBtn.addEventListener('click', () => { window.location.href = d.paymentUrl; }, { once:true });
    }
  });
})();
