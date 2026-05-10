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

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      const { appointmentId, razorpayOrderId } = await response.json();

      const razorpay = new Razorpay({
        key: 'rzp_test_8Tg095AU86SIcj',
        amount: Number(payload.amount) * 100,
        currency: 'INR',
        name: 'OneLife',
        description: 'Appointment Payment',
        order_id: razorpayOrderId,
        handler: async (paymentResponse) => {
          await fetch('/save-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId,
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
              signature: paymentResponse.razorpay_signature,
            }),
          });

          window.location.href = `/payment-success?paymentId=${paymentResponse.razorpay_payment_id}`;
        },
      });

      razorpay.open();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Unable to start the payment flow right now.');
    }
  });
}
