const loginError = document.getElementById('error-msg');

if (loginError) {
  window.setTimeout(() => {
    loginError.classList.add('hidden');
  }, 5000);
}
