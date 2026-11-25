const DISEASE_ALIAS_MAP = {
  bp: "hypertension",
  "high blood pressure": "hypertension",
  "high bp": "hypertension",
  sugar: "diabetes",
  "blood sugar": "diabetes",
  tb: "tuberculosis",
  flu: "influenza",
  corona: "covid-19",
  covid: "covid-19",
  stomach: "gastroenteritis",
  "food poisoning": "gastroenteritis",
  headache: "migraine",
  fit: "epilepsy",
  acne: "acne",
  pcod: "pcos",
};

const CURATED_DISEASE_KB = {
  diabetes: {
    pageTitle: "Diabetes Mellitus (Blood Sugar)",
    speciality: "General physician",
    intro: "Diabetes is a chronic metabolic condition occurring either when the pancreas does not produce enough insulin or when the body cannot effectively use the insulin it produces, leading to elevated blood glucose (sugar).",
    keyFacts: [
      "Early glycemic control markedly reduces kidney, eye (retinopathy), nerve, and cardiovascular complications.",
      "Fasting blood glucose >= 126 mg/dL or HbA1c >= 6.5% typically warrants medical evaluation.",
    ],
    symptoms: [
      "Increased thirst and frequent urination (especially at night)",
      "Unexplained fatigue, unintentional weight changes, or blurred vision",
      "Slow-healing cuts or frequent skin infections",
    ],
    treatment: [
      "Personalized nutrition, low-glycemic balanced meals, and regular physical activity",
      "Oral hypoglycemic agents or insulin therapy as prescribed by a physician",
      "Periodic HbA1c monitoring every 3 months and annual eye/kidney screening",
    ],
    prevention: [
      "Maintain healthy waist circumference and daily 30-minute brisk walking",
      "Limit refined sugars, sugary beverages, and ultra-processed carbohydrates",
      "Screen annually after age 30 or earlier if there is a family history",
    ],
  },
  hypertension: {
    pageTitle: "Hypertension (High Blood Pressure)",
    speciality: "General physician",
    intro: "Hypertension occurs when the force of blood pushing against artery walls remains consistently elevated (>= 140/90 mmHg), often progressing silently without obvious early warning signs.",
    keyFacts: [
      "Often called a silent risk factor because many patients feel completely normal until complications occur.",
      "Lowering systolic blood pressure significantly cuts stroke and heart disease risk.",
    ],
    symptoms: [
      "Usually asymptomatic in mild or moderate stages",
      "Morning headaches, dizziness, or buzzing in the ears when severely elevated",
      "Seek emergency care immediately if paired with chest pain, shortness of breath, or weakness on one side",
    ],
    treatment: [
      "Daily blood pressure medication prescribed by a physician (do not skip or abruptly stop doses)",
      "Home blood pressure logging twice daily before clinic review",
      "Reduction in dietary sodium (< 5g salt/day total)",
    ],
    prevention: [
      "Limit table salt, pickles, papad, and packaged salty snacks",
      "Regular aerobic exercise, tobacco cessation, and stress/sleep management",
    ],
  },
  dengue: {
    pageTitle: "Dengue Fever",
    speciality: "General physician",
    intro: "Dengue is a mosquito-borne viral infection transmitted primarily by daytime-biting Aedes aegypti mosquitoes, common during monsoon and post-monsoon seasons.",
    keyFacts: [
      "Most patients recover in 1–2 weeks with careful hydration, but platelet drops and plasma leakage require close monitoring around days 3–7.",
      "Avoid aspirin and NSAIDs (ibuprofen/diclofenac) unless cleared by a doctor due to bleeding risk.",
    ],
    symptoms: [
      "Sudden high fever (102–104°F) with severe headache and pain behind the eyes",
      "Severe joint, muscle, and bone aches ('breakbone fever') and skin rash",
      "Warning signs needing urgent hospital care: persistent vomiting, abdominal pain, mucosal bleeding, severe lethargy",
    ],
    treatment: [
      "Strict oral hydration (ORS, coconut water, fluids) and doctor-guided fever management (usually paracetamol)",
      "Serial Complete Blood Count (CBC) / platelet monitoring as advised by your physician",
    ],
    prevention: [
      "Empty stagnant water in coolers, flower pots, and open containers weekly",
      "Use mosquito repellents, window screens, and full-sleeve clothing during daytime",
    ],
  },
  malaria: {
    pageTitle: "Malaria",
    speciality: "General physician",
    intro: "Malaria is a preventable and curable parasitic infection spread through bites of infected female Anopheles mosquitoes, causing cyclic fever and chills.",
    keyFacts: [
      "Prompt blood smear or rapid diagnostic testing (RDT) ensures exact species treatment.",
      "Completing the full prescribed antimalarial course prevents relapse and drug resistance.",
    ],
    symptoms: [
      "High fever spikes accompanied by intense chills, shivering, and drenching sweats",
      "Headache, body aches, nausea, and weakness",
      "Severe signs: confusion, jaundice, dark urine, or breathing difficulty require emergency care",
    ],
    treatment: [
      "Confirmed diagnosis via rapid antigen test or microscopy followed by species-specific antimalarial therapy",
      "Adequate hydration and physician monitoring until fever resolves completely",
    ],
    prevention: [
      "Sleep under insecticide-treated bed nets in endemic regions",
      "Eliminate standing water near homes and use repellents after dusk",
    ],
  },
  tuberculosis: {
    pageTitle: "Tuberculosis (TB)",
    speciality: "General physician",
    intro: "Tuberculosis is a treatable bacterial infection (Mycobacterium tuberculosis) that most commonly affects the lungs and spreads through airborne droplets from prolonged close contact.",
    keyFacts: [
      "Standard drug-sensitive pulmonary TB is curable with a strict uninterrupted 6-month antibiotic regimen.",
      "Stopping medicines early is the primary cause of multidrug-resistant TB.",
    ],
    symptoms: [
      "Persistent cough lasting 2 weeks or longer (sometimes with blood-streaked sputum)",
      "Evening fever spikes, night sweats, loss of appetite, and unintentional weight loss",
    ],
    treatment: [
      "Sputum CBNAAT/smear evaluation and chest X-ray through a physician",
      "Supervised daily multi-drug anti-TB therapy completed for the full prescribed duration",
    ],
    prevention: [
      "Early diagnosis and mask hygiene during active cough phase",
      "Good indoor ventilation and household contact screening",
    ],
  },
  typhoid: {
    pageTitle: "Typhoid Fever (Enteric Fever)",
    speciality: "General physician",
    intro: "Typhoid fever is an acute bacterial illness caused by Salmonella Typhi, transmitted through contaminated drinking water or food.",
    keyFacts: [
      "Step-ladder rising fever with abdominal discomfort is a classic clinical presentation.",
      "Blood culture provides much more reliable confirmation than standalone Widal screening in the first week.",
    ],
    symptoms: [
      "Gradually rising sustained fever, headache, and marked weakness",
      "Loss of appetite, abdominal pain, constipation or diarrhea",
    ],
    treatment: [
      "Targeted antibiotics prescribed strictly after clinician evaluation (avoid self-medicating antibiotics)",
      "Soft easily digestible diet and plenty of safe boiled/filtered fluids",
    ],
    prevention: [
      "Drink boiled or RO-purified water and eat freshly cooked hot food",
      "Strict handwashing before meals and after restroom use",
    ],
  },
  migraine: {
    pageTitle: "Migraine & Recurrent Headache",
    speciality: "Neurologist",
    intro: "Migraine is a neurological headache disorder marked by recurring throbbing pain (typically one-sided) often accompanied by nausea and sensitivity to light or sound.",
    keyFacts: [
      "Identifying personal triggers (skipped meals, dehydration, sleep debt, bright glare) cuts attack frequency.",
      "Sudden 'thunderclap' worst-ever headache or headache with weakness/vision loss needs emergency care.",
    ],
    symptoms: [
      "Moderate to severe pulsating headache on one or both sides of the head",
      "Sensitivity to bright lights, loud sounds, or nausea",
      "Visual aura (flashing zig-zag lines or blind spots) prior to headache onset in some patients",
    ],
    treatment: [
      "Neurologist-guided acute abortive medication taken early at headache onset",
      "Preventive daily prophylaxis if attacks occur frequently (> 4 headache days/month)",
    ],
    prevention: [
      "Maintain consistent sleep/wake hours and never skip meals",
      "Stay hydrated and track triggers in a simple headache diary",
    ],
  },
  asthma: {
    pageTitle: "Bronchial Asthma",
    speciality: "General physician",
    intro: "Asthma is a chronic airway condition where bronchial tubes become inflamed and narrowed periodically, leading to wheezing, cough, and breathlessness.",
    keyFacts: [
      "Daily controller inhalers keep airway inflammation quiet; rescue inhalers quickly relieve acute tightness.",
      "Correct inhaler spacer technique drastically improves lung medicine delivery.",
    ],
    symptoms: [
      "Wheezing (whistling chest sound), chest tightness, and shortness of breath",
      "Night-time or early-morning dry cough triggered by dust, cold air, smoke, or pollution",
    ],
    treatment: [
      "Doctor-prescribed inhaled corticosteroids (controller) and short-acting bronchodilator (reliever)",
      "Avoidance of indoor smoke, mosquito coils, incense fumes, and dust mites",
    ],
    prevention: [
      "Use N95 mask protection during high AQI/pollution days",
      "Keep rescue inhaler accessible and follow a written asthma action plan",
    ],
  },
  pcos: {
    pageTitle: "PCOS (Polycystic Ovary Syndrome)",
    speciality: "Gynecologist",
    intro: "PCOS is a common hormonal condition in women of reproductive age involving irregular ovulation, insulin resistance, and elevated androgen levels.",
    keyFacts: [
      "Even modest 5–7% lifestyle weight stabilization restores regular menstrual cycles in many patients.",
      "Early screening manages long-term diabetes, fertility, and cholesterol health.",
    ],
    symptoms: [
      "Irregular, delayed, or missed menstrual periods",
      "Persistent facial/back acne, excess facial hair growth, or scalp hair thinning",
      "Weight gain around the waist or darkened skin folds (neck/underarms)",
    ],
    treatment: [
      "Gynecologist assessment (pelvic ultrasound, hormone & insulin/thyroid blood panel)",
      "Structured strength/cardio exercise, high-protein high-fiber nutrition, and targeted therapy when needed",
    ],
    prevention: [
      "Balanced low-glycemic diet and regular physical activity",
      "Consistent sleep rhythm and annual metabolic checkups",
    ],
  },
  gastroenteritis: {
    pageTitle: "Acute Gastroenteritis",
    speciality: "Gastroenterologist",
    intro: "Gastroenteritis is inflammation of the stomach and intestines caused by viral or bacterial infections, leading to diarrhea, vomiting, and abdominal cramps.",
    keyFacts: [
      "Dehydration—not infection alone—is the main immediate hazard, especially in children and elders.",
      "WHO low-osmolarity ORS replaces lost water and electrolytes faster than plain water.",
    ],
    symptoms: [
      "Watery stools, abdominal cramping, nausea, and vomiting",
      "Warning signs: dry tongue, sunken eyes, no urine for > 6 hours, blood in stools, or high fever",
    ],
    treatment: [
      "Frequent sips of Oral Rehydration Solution (ORS), zinc (especially in children per doctor), and light foods",
      "Medical evaluation if blood/mucus appears in stool or vomiting prevents keeping fluids down",
    ],
    prevention: [
      "Handwashing with soap before preparing or eating food",
      "Avoid street-cut raw fruits or unchilled dairy in hot summer months",
    ],
  },
};

function normaliseDiseaseQuery(rawName) {
  const cleaned = String(rawName || "").trim().toLowerCase().replace(/\s+/g, " ");
  return DISEASE_ALIAS_MAP[cleaned] || cleaned;
}

function getLocalDiseaseEntry(rawName) {
  const canonical = normaliseDiseaseQuery(rawName);
  const hit = CURATED_DISEASE_KB[canonical] || CURATED_DISEASE_KB[canonical.replace(/\s+/g, "-")];
  if (!hit) return null;
  return {
    disease: canonical,
    pageTitle: hit.pageTitle,
    speciality: hit.speciality,
    intro: hit.intro,
    keyFacts: hit.keyFacts,
    symptoms: hit.symptoms,
    treatment: hit.treatment,
    prevention: hit.prevention,
    sourceType: "curated_clinical_kb",
    scrapedAt: new Date().toISOString(),
  };
}

module.exports = {
  CURATED_DISEASE_KB,
  getLocalDiseaseEntry,
  normaliseDiseaseQuery,
};
