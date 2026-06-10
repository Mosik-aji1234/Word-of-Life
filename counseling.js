const form = document.getElementById('counseling-form');
const successMessage = document.getElementById('form-success');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name')?.toString().trim() || '',
      phone: formData.get('phone')?.toString().trim() || '',
      email: formData.get('email')?.toString().trim() || '',
      message: formData.get('message')?.toString().trim() || ''
    };
    const submitButton = form.querySelector('button[type="submit"]');

    if (successMessage) {
      successMessage.hidden = false;
      successMessage.innerText = 'Sending your request...';
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch('/api/counseling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Unable to send your request right now.');

      form.reset();
      if (successMessage) successMessage.innerText = result.message || 'Your counseling request has been received.';
    } catch (error) {
      if (successMessage) {
        successMessage.innerText = `${error.message} Please try again or contact us directly by email.`;
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
