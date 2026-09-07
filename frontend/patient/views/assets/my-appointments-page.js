const appointmentActions = document.querySelectorAll('.appointment-action');

async function handleAppointmentAction(action, appointmentId) {
  const endpoint = action === 'cancel' ? `/clearapp/${appointmentId}` : `/make-online/${appointmentId}`;

  try {
    const response = await fetch(endpoint, { method: 'POST' });

    if (action === 'cancel') {
      if (!response.ok) {
        throw new Error('Failed to cancel appointment');
      }

      window.location.reload();
      return;
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error('Failed to request online appointment');
    }

    alert('Online appointment request sent successfully!');
    window.location.reload();
  } catch (error) {
    console.error('Appointment action failed:', error);
    alert(action === 'cancel' ? 'Failed to cancel the appointment.' : 'Failed to request online appointment.');
  }
}

appointmentActions.forEach((button) => {
  button.addEventListener('click', () => {
    handleAppointmentAction(button.dataset.action, button.dataset.appointmentId);
  });
});
