const appointmentActions = document.querySelectorAll('.appointment-action');

async function handleAppointmentAction(action, appointmentId) {
  if (action === 'reschedule') {
    document.getElementById(`reschedule-${appointmentId}`)?.classList.toggle('hidden');
    return;
  }
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

function indiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((value, part) => ({ ...value, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function loadRescheduleSlots(panel) {
  const date = panel.querySelector('.reschedule-date');
  const time = panel.querySelector('.reschedule-time');
  const message = panel.querySelector('.reschedule-message');
  if (!date.value) return;
  time.disabled = true;
  time.innerHTML = '<option value="">Loading slots…</option>';
  message.textContent = 'Checking the doctor’s live calendar…';
  try {
    const response = await fetch(`/doctors/${panel.dataset.doctorId}/slots?date=${encodeURIComponent(date.value)}&excludeAppointmentId=${encodeURIComponent(panel.dataset.appointmentId)}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load slots.');
    time.replaceChildren(new Option(data.slots.length ? 'Choose an available time' : 'No slots available', ''));
    data.slots.forEach((slot) => time.add(new Option(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(slot.startsAt)), slot.time)));
    time.disabled = !data.slots.length;
    message.textContent = data.slots.length ? `${data.slots.length} times are available.` : 'No available times for this date.';
  } catch (error) {
    time.innerHTML = '<option value="">Unable to load slots</option>';
    message.textContent = error.message;
  }
}

document.querySelectorAll('.reschedule-panel').forEach((panel) => {
  const date = panel.querySelector('.reschedule-date');
  date.min = indiaDate();
  date.addEventListener('change', () => loadRescheduleSlots(panel));
  panel.querySelector('.reschedule-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const time = panel.querySelector('.reschedule-time');
    const message = panel.querySelector('.reschedule-message');
    try {
      const response = await fetch(`/appointments/${panel.dataset.appointmentId}/reschedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date.value, time: time.value }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to reschedule appointment.');
      window.location.reload();
    } catch (error) { message.textContent = error.message; }
  });
});

document.querySelectorAll('.waitlist-cancel').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const response = await fetch(`/waitlist/${button.dataset.waitlistId}/cancel`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to leave waitlist.');
      window.location.reload();
    } catch (error) { button.disabled = false; alert(error.message || 'Unable to leave waitlist.'); }
  });
});
