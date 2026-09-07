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
if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
