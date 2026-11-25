const User = require("../models/user");
const { availableSlotsForDoctor, localDateKey } = require("./scheduling");
const { doctorImage } = require("./doctor-image");

const SPECIALTY_RULES = [
  {
    speciality: "Neurologist",
    pattern: /\b(migraine|headache|seizure|vertigo|dizziness|numbness|tingling|tremor|memory|stroke|nerve|neuro)\b/i,
  },
  {
    speciality: "Dermatologist",
    pattern: /\b(rash|itch|acne|eczema|psoriasis|skin|hair loss|dandruff|fungal|allergy|hives|nail)\b/i,
  },
  {
    speciality: "Pediatricians",
    pattern: /\b(child|baby|infant|toddler|kid|pediatric|newborn|vaccin|son|daughter)\b/i,
  },
  {
    speciality: "Gynecologist",
    pattern: /\b(pcos|pcod|period|menstrual|pregnan|gynec|pelvic|prenatal|fertility|ovary|vaginal)\b/i,
  },
  {
    speciality: "Gastroenterologist",
    pattern: /\b(stomach|abdomen|acid|reflux|gerd|ulcer|liver|jaundice|diarrh|constipat|bloat|vomit|gastro|ibs|bowel)\b/i,
  },
  {
    speciality: "General physician",
    pattern: /\b(fever|cough|cold|diabetes|sugar|bp|hypertension|thyroid|infection|dengue|malaria|typhoid|fatigue|pain|asthma)\b/i,
  },
];

function inferSpecialityFromText(text = "") {
  const input = String(text || "");
  for (const rule of SPECIALTY_RULES) {
    if (rule.pattern.test(input)) return rule.speciality;
  }
  return "General physician";
}

function nextDayKeys() {
  const now = Date.now();
  return [localDateKey(new Date(now)), localDateKey(new Date(now + 24 * 60 * 60 * 1000))];
}

async function recommendCliniciansForMessage(text) {
  const speciality = inferSpecialityFromText(text);
  let doctors = await User.find({ role: "DOCTOR", available: true, speciality })
    .select("_id fullname speciality degree experience fees image available availability ratingAverage ratingCount")
    .sort({ ratingAverage: -1 })
    .limit(3)
    .lean();

  if (!doctors.length) {
    doctors = await User.find({ role: "DOCTOR", available: true })
      .select("_id fullname speciality degree experience fees image available availability ratingAverage ratingCount")
      .sort({ ratingAverage: -1 })
      .limit(2)
      .lean();
  }

  const [todayKey, tomorrowKey] = nextDayKeys();
  const recommendations = [];

  for (const doc of doctors) {
    let nextSlotLabel = "Check calendar";
    try {
      const todaySlots = await availableSlotsForDoctor(doc, todayKey);
      if (todaySlots.length) {
        nextSlotLabel = `Today, ${todaySlots[0].time}`;
      } else {
        const tomorrowSlots = await availableSlotsForDoctor(doc, tomorrowKey);
        if (tomorrowSlots.length) nextSlotLabel = `Tomorrow, ${tomorrowSlots[0].time}`;
      }
    } catch {
      nextSlotLabel = "View slots";
    }

    recommendations.push({
      id: String(doc._id),
      fullname: doc.fullname,
      speciality: doc.speciality,
      degree: doc.degree || "MBBS",
      fees: doc.fees || 500,
      ratingAverage: doc.ratingAverage || 0,
      ratingCount: doc.ratingCount || 0,
      image: doctorImage(doc.image),
      nextSlotLabel,
      bookingUrl: `/appointment/${doc._id}?complaint=${encodeURIComponent(String(text || "").slice(0, 140))}`,
    });
  }

  return { speciality, recommendations };
}

module.exports = {
  inferSpecialityFromText,
  recommendCliniciansForMessage,
};
