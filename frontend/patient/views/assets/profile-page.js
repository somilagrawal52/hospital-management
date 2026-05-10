const profileState = { isEdit: false };

const editTargets = [
  ['image-input', 'profile-image'],
  ['fullname-input', 'fullname-text'],
  ['email-input', 'email-text'],
  ['phone-input', 'phone-text'],
  ['address-input', 'address-text'],
  ['gender-input', 'gender-text'],
  ['dob-input', 'dob-text'],
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

  toggleHidden('edit-button', profileState.isEdit);
  toggleHidden('save-button', !profileState.isEdit);
}

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

      if (!data.success) {
        throw new Error('Failed to update profile');
      }

      document.getElementById('fullname-text').textContent = document.getElementById('fullname-input').value;
      document.getElementById('email-text').textContent = document.getElementById('email-input').value;
      document.getElementById('phone-text').textContent = document.getElementById('phone-input').value;
      document.getElementById('address-text').innerHTML = `${document.getElementById('address-input-1').value}<br />${document.getElementById('address-input-2').value}`;
      document.getElementById('gender-text').textContent = document.getElementById('gender-input').value;
      document.getElementById('dob-text').textContent = document.getElementById('dob-input').value;

      if (imageFile) {
        document.getElementById('profile-image').src = URL.createObjectURL(imageFile);
      }

      toggleEditMode();
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating the profile.');
    }
  });
}
