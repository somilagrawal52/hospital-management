(() => {
  const token = document.querySelector('meta[name="csrf-token"]')?.content;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : input, window.location.href);
    const method = String(options.method || request?.method || 'GET').toUpperCase();
    if (url.origin === window.location.origin && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const headers = new Headers(options.headers || request?.headers);
      if (token) headers.set('X-CSRF-Token', token);
      options = { ...options, headers };
    }
    return originalFetch(input, options);
  };
  // Multipart tokens must be checked before Multer writes an uploaded file.
  // This preserves the form's URL, fields, validation and server redirects.
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.enctype !== 'multipart/form-data' || form.method.toLowerCase() !== 'post' || event.defaultPrevented) return;
    if (new URL(form.action).origin !== location.origin) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const response = await window.fetch(form.action, { method: 'POST', body: new FormData(form) });
      if (response.redirected && response.ok) return location.assign(response.url);
      const data = await response.json();
      throw new Error(data.message || data.error || 'Unable to submit the form.');
    } catch (error) {
      window.alert(error.message || 'Unable to submit the form.');
      if (button) button.disabled = false;
    }
  });
})();
