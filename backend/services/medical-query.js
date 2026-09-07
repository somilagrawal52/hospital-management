const MEDICAL_ONLY_FALLBACK = "I can help only with general medical and health-related questions. Please ask about symptoms, conditions, medicines, appointments, prevention, or healthy living.";

const medicalPatterns = [
  /\b(symptom|symptoms|health|medical|medicine|medication|drug|prescription|dosage|dose|side effect|treatment|diagnosis|disease|condition|infection|virus|bacteria)\b/i,
  /\b(doctor|hospital|clinic|appointment|patient|nurse|specialist|therapy|therapist|emergency|first aid|vaccin|immuni[sz]ation|test|scan|x-?ray|mri|blood pressure|blood sugar|cholesterol)\b/i,
  /\b(pain|fever|cough|cold|headache|migraine|dizziness|nausea|vomit|diarrh|constipat|rash|allerg|wound|injury|swelling|fatigue|insomnia|sleep)\b/i,
  /\b(diabetes|asthma|cancer|heart|stroke|thyroid|kidney|liver|skin|mental health|anxiety|depression|pregnan|menstrual|nutrition|diet|exercise|weight loss)\b/i,
];

function isMedicalQuery(message) {
  return medicalPatterns.some((pattern) => pattern.test(message));
}

module.exports = { isMedicalQuery, MEDICAL_ONLY_FALLBACK };
