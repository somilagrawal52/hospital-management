const appointmentForm = document.getElementById('appointmentForm');

if (appointmentForm) {
  appointmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(appointmentForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create appointment');
      const { appointmentId, razorpayOrderId, amount } = result;

      const razorpay = new Razorpay({
        key: window.RAZORPAY_KEY,
        amount,
        currency: 'INR',
        name: 'OneLife',
        description: 'Appointment Payment',
        order_id: razorpayOrderId,
        handler: async (paymentResponse) => {
          const verification = await fetch('/save-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId,
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
              signature: paymentResponse.razorpay_signature,
            }),
          });
          if (!verification.ok) {
            const error = await verification.json();
            throw new Error(error.message || 'Payment verification failed');
          }

          window.location.href = `/payment-success?paymentId=${paymentResponse.razorpay_payment_id}`;
        },
      });

      razorpay.open();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert(error.message || 'Unable to start the payment flow right now.');
    }
  });
}

const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const slotMessage = document.getElementById('slot-message');
const waitlistPanel = document.getElementById('waitlist-panel');
const waitlistButton = document.getElementById('join-waitlist');

function indiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((value, part) => ({ ...value, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatSlot(iso) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

async function loadSlots() {
  if (!dateInput?.value || !window.DOCTOR_ID) return;
  timeSelect.disabled = true;
  timeSelect.innerHTML = '<option value="">Loading available slots…</option>';
  slotMessage.textContent = 'Checking the doctor’s live calendar…';
  waitlistPanel?.classList.add('hidden');
  try {
    const response = await fetch(`/doctors/${window.DOCTOR_ID}/slots?date=${encodeURIComponent(dateInput.value)}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load appointment slots.');
    timeSelect.replaceChildren(new Option(data.slots.length ? 'Choose an available time' : 'No slots are available', ''));
    data.slots.forEach((slot) => timeSelect.add(new Option(formatSlot(slot.startsAt), slot.time)));
    timeSelect.disabled = !data.slots.length;
    slotMessage.textContent = data.slots.length ? `${data.slots.length} real-time slots available.` : (data.unavailable ? 'This doctor is currently unavailable.' : 'No slots are available for this date.');
    if (!data.slots.length) waitlistPanel?.classList.remove('hidden');
  } catch (error) {
    timeSelect.innerHTML = '<option value="">Unable to load slots</option>';
    slotMessage.textContent = error.message;
    waitlistPanel?.classList.remove('hidden');
  }
}

if (dateInput) {
  dateInput.min = indiaDate();
  dateInput.addEventListener('change', loadSlots);
}

const memberSelect = document.getElementById('memberId');
const allergiesInput = document.getElementById('allergies');
memberSelect?.addEventListener('change', () => {
  const opt = memberSelect.selectedOptions?.[0];
  if (opt && allergiesInput) {
    allergiesInput.value = opt.dataset.allergies || '';
  }
});

waitlistButton?.addEventListener('click', async () => {
  if (!dateInput?.value) return;
  waitlistButton.disabled = true;
  try {
    const response = await fetch('/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctorId: window.DOCTOR_ID, date: dateInput.value }) });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to join the waitlist.');
    waitlistButton.textContent = 'Added to waitlist';
  } catch (error) {
    waitlistButton.disabled = false;
    alert(error.message || 'Unable to join the waitlist.');
  }
});
