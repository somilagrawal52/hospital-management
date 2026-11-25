const diseaseForm = document.getElementById('searchForm');
const diseaseInput = document.getElementById('diseaseInput');
const loadingState = document.getElementById('loading');
const errorState = document.getElementById('error');
const resultsState = document.getElementById('results');
const exampleButtons = document.querySelectorAll('.example-tag');

function setDisplay(element, shouldShow, displayValue = 'block') {
  if (!element) {
    return;
  }

  element.style.display = shouldShow ? displayValue : 'none';
}

function populateList(listId, items) {
  const list = document.getElementById(listId);
  if (!list) {
    return;
  }

  list.innerHTML = '';

  if (!items || items.length === 0) {
    return;
  }

  items.forEach((item) => {
    if (
      item &&
      item !== 'No symptoms section found' &&
      item !== 'No key facts found' &&
      item !== 'No treatment info found' &&
      item !== 'No prevention info found'
    ) {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      list.appendChild(listItem);
    }
  });
}

function toggleSection(sectionId, data) {
  const section = document.getElementById(sectionId);
  const hasValidData =
    data &&
    data.length > 0 &&
    !data.every((item) => item.includes('not found') || item.includes('No '));

  setDisplay(section, hasValidData);
}

function displayResults(data) {
  document.getElementById('diseaseTitle').textContent = data.pageTitle || data.disease;
  document.getElementById('introContent').textContent = data.intro;

  populateList('factsList', data.keyFacts);
  populateList('symptomsList', data.symptoms);
  populateList('treatmentList', data.treatment);
  populateList('preventionList', data.prevention);

  toggleSection('factsSection', data.keyFacts);
  toggleSection('symptomsSection', data.symptoms);
  toggleSection('treatmentSection', data.treatment);
  toggleSection('preventionSection', data.prevention);

  const consultBtn = document.getElementById('consultSpecialistBtn');
  const consultLabel = document.getElementById('consultSpecialistLabel');
  if (consultBtn) {
    consultBtn.href = data.speciality ? `/doctors/${encodeURIComponent(data.speciality)}` : '/doctors';
  }
  if (consultLabel) {
    consultLabel.textContent = data.speciality ? `Consult a ${data.speciality}` : 'Consult a Specialist';
  }

  setDisplay(resultsState, true);
}

function showError(message) {
  if (!errorState) {
    return;
  }

  errorState.textContent = message;
  setDisplay(errorState, true);
}

async function searchDisease(diseaseName) {
  diseaseInput.value = diseaseName;
  setDisplay(loadingState, true);
  setDisplay(errorState, false);
  setDisplay(resultsState, false);

  try {
    const response = await fetch(`/disease/${encodeURIComponent(diseaseName)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch data');
    }

    displayResults(data);
  } catch (error) {
    showError(error.message);
  } finally {
    setDisplay(loadingState, false);
  }
}

if (diseaseForm && diseaseInput) {
  diseaseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const diseaseName = diseaseInput.value.trim();
    if (diseaseName) {
      await searchDisease(diseaseName);
    }
  });
}

exampleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    searchDisease(button.dataset.disease);
  });
});
