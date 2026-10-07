const EMERGENCY_MESSAGE = "Your message may describe a medical emergency. Please call your local emergency number now or go to the nearest emergency department. Do not wait for an online reply.";

const redFlagPatterns = [
  /\b(chest pain|pressure in (my |the )?chest|heart attack)\b/i,
  /\b(can'?t breathe|cannot breathe|trouble breathing|shortness of breath|severe breathlessness)\b/i,
  /\b(stroke|face droop|slurred speech|one[- ]sided weakness)\b/i,
  /\b(unconscious|passed out|seizure|not waking)\b/i,
  /\b(severe bleeding|bleeding won'?t stop|vomiting blood|blood in vomit)\b/i,
  /\b(overdose|suicid|self[- ]harm|kill myself)\b/i,
];

function isEmergencyMessage(message) {
  return redFlagPatterns.some((pattern) => pattern.test(String(message || "")));
}

module.exports = { EMERGENCY_MESSAGE, isEmergencyMessage };
