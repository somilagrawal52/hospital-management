const profileState = { isEdit: false };

const editTargets = [
  ['fullname-input', 'fullname-text'],
  ['email-input', 'email-text'],
  ['phone-input', 'phone-text'],
  ['address-input', 'address-text'],
  ['gender-input', 'gender-text'],
  ['dob-input', 'dob-text'],
  ['bloodGroup-input', 'bloodGroup-text'],
  ['allergies-input', 'allergies-text'],
  ['chronicConditions-input', 'chronicConditions-text'],
  ['abhaId-input', 'abhaId-text'],
];

function toggleHidden(elementId, shouldHide) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.classList.toggle('hidden', shouldHide);
}

function toggleEditMode() {
  profileState.isEdit = !profileState.isEdit;

  editTargets.forEach(([inputId, textId]) => {
    toggleHidden(inputId, !profileState.isEdit);
    toggleHidden(textId, profileState.isEdit);
  });

  const imageInput = document.getElementById('image-input');
  if (imageInput) imageInput.disabled = !profileState.isEdit;
  toggleHidden('image-upload-overlay', !profileState.isEdit);
  toggleHidden('edit-button', profileState.isEdit);
  toggleHidden('save-button', !profileState.isEdit);
}

const imageInputEl = document.getElementById('image-input');
imageInputEl?.addEventListener('change', () => {
  const file = imageInputEl.files?.[0];
  if (file) {
    document.getElementById('profile-image').src = URL.createObjectURL(file);
  }
});

const editButton = document.getElementById('edit-button');
const saveButton = document.getElementById('save-button');

if (editButton && saveButton) {
  editButton.addEventListener('click', toggleEditMode);

  saveButton.addEventListener('click', async () => {
    const formData = new FormData();
    formData.append('fullname', document.getElementById('fullname-input').value);
    formData.append('email', document.getElementById('email-input').value);
    formData.append('number', document.getElementById('phone-input').value);
    formData.append(
      'address',
      JSON.stringify({
        line1: document.getElementById('address-input-1').value,
        line2: document.getElementById('address-input-2').value,
      })
    );
    formData.append('dob', document.getElementById('dob-input').value);
    formData.append('gender', document.getElementById('gender-input').value);
    if (document.getElementById('bloodGroup-input')) {
      formData.append('bloodGroup', document.getElementById('bloodGroup-input').value);
    }
    if (document.getElementById('allergies-input')) {
      formData.append('allergies', document.getElementById('allergies-input').value);
    }
    if (document.getElementById('chronicConditions-input')) {
      formData.append('chronicConditions', document.getElementById('chronicConditions-input').value);
    }
    if (document.getElementById('abhaId-input')) {
      formData.append('abhaId', document.getElementById('abhaId-input').value);
    }

    const imageFile = document.getElementById('image-input').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const response = await fetch('/update-profile', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      document.getElementById('fullname-text').textContent = document.getElementById('fullname-input').value;
      document.getElementById('email-text').textContent = document.getElementById('email-input').value;
      document.getElementById('phone-text').textContent = document.getElementById('phone-input').value;
      document.getElementById('address-text').innerHTML = `${document.getElementById('address-input-1').value}<br />${document.getElementById('address-input-2').value}`;
      document.getElementById('gender-text').textContent = document.getElementById('gender-input').value;
      document.getElementById('dob-text').textContent = document.getElementById('dob-input').value;
      if (document.getElementById('bloodGroup-text')) {
        document.getElementById('bloodGroup-text').textContent = document.getElementById('bloodGroup-input')?.value || 'Not specified';
      }
      if (document.getElementById('allergies-text')) {
        document.getElementById('allergies-text').textContent = document.getElementById('allergies-input')?.value || 'None specified';
      }
      if (document.getElementById('chronicConditions-text')) {
        document.getElementById('chronicConditions-text').textContent = document.getElementById('chronicConditions-input')?.value || 'None specified';
      }
      if (document.getElementById('abhaId-text')) {
        document.getElementById('abhaId-text').textContent = document.getElementById('abhaId-input')?.value || 'Optional / Not linked';
      }

      if (imageFile) {
        document.getElementById('profile-image').src = URL.createObjectURL(imageFile);
      }

      toggleEditMode();
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'An error occurred while updating the profile.');
    }
  });
}

const dependentForm = document.getElementById('dependent-form');
dependentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(dependentForm).entries());
  try {
    const response = await fetch('/profile/dependents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to add family member.');
    window.location.reload();
  } catch (error) {
    alert(error.message || 'Unable to save family profile.');
  }
});

document.querySelectorAll('.remove-dependent').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const response = await fetch(`/profile/dependents/${button.dataset.id}/delete`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to remove profile.');
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      alert(error.message || 'Unable to remove profile.');
    }
  });
});
