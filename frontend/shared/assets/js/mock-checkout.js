// Served only by the isolated mock-mode booking template. No provider SDK.
window.Razorpay = class MockCheckout {
  constructor(options) { this.options = options; }
  async open() {
    if (!window.confirm('Simulate a successful staging payment? No money will be charged.')) return;
    try {
      const response = await fetch('/testing/mock-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: this.options.order_id }) });
      const result = await response.json();
      if (!response.ok || !result.mocked) throw new Error(result.message || 'Mock payment is unavailable.');
      await this.options.handler(result);
    } catch (error) { window.alert(error.message || 'Unable to simulate payment.'); }
  }
};
