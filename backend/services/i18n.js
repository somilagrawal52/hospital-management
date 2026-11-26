const TRANSLATIONS = {
  en: {
    "nav.home": "Home",
    "nav.clinicians": "Clinicians",
    "nav.disease": "Disease Guide",
    "nav.ai": "AI Health Assistant",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.support": "Support",
    "nav.records": "Health Records",
    "nav.appointments": "My Appointments",
    "nav.profile": "My Health Profile",
    "nav.signin": "Sign In",
    "nav.signup": "Create Account",
    "hero.badge": "ISO 27001 & Telehealth Ready Healthcare Suite",
    "hero.title1": "Exceptional Medical Care",
    "hero.title2": "Reimagined for You",
    "hero.subtitle": "Connect with board-certified physicians, track live OPD queue tokens, reserve clinic slots, or launch encrypted HD telehealth in seconds.",
    "hero.findDoctor": "Find a Doctor",
    "hero.diseaseGuide": "Disease Guide",
    "hero.aiCta": "AI Health Assistant",
    "emergency.prefix": "Emergency Disclaimer:",
    "emergency.body": "If you or a patient is experiencing severe chest pain, acute respiratory distress, or trauma, dial emergency services (112 / 911 / 108) immediately.",
    "appointments.title": "My Appointments & Consultations",
    "appointments.subtitle": "Track live OPD queue tokens, join virtual telehealth sessions, download e-Prescriptions, and export GST tax invoices.",
    "records.title": "Patient Health Records & e-Prescriptions",
    "records.subtitle": "View completed consultations, download QR-verified digital prescriptions, allergies, and upcoming follow-up dates.",
    "home.specTitle": "Find Doctors by Medical Specialty",
    "home.specSub": "Select a clinical discipline to explore board-certified specialists, examine verified credentials, and book consultation slots.",
    "home.docsTitle": "Available Clinicians & Specialists",
    "home.docsSub": "Schedule instant in-clinic visits or launch high-definition video consultations.",
    "home.viewAllDocs": "View All Clinicians",
    "home.bookBtn": "Book Consultation",
    "home.askAiBtn": "Ask AI Assistant",
    "doctors.heading": "Meet Our Medical Specialists",
    "doctors.subheading": "Browse verified clinicians, compare consultation fees, and schedule in-clinic or virtual telehealth visits.",
  },
  hi: {
    "nav.home": "होम",
    "nav.clinicians": "डॉक्टर्स",
    "nav.disease": "रोग गाइड",
    "nav.ai": "AI स्वास्थ्य सहायक",
    "nav.about": "हमारे बारे में",
    "nav.contact": "संपर्क",
    "nav.support": "सहायता",
    "nav.records": "मेडिकल रिकॉर्ड",
    "nav.appointments": "मेरी अपॉइंटमेंट",
    "nav.profile": "स्वास्थ्य प्रोफ़ाइल",
    "nav.signin": "लॉग इन",
    "nav.signup": "खाता बनाएँ",
    "hero.badge": "टेलीहेल्थ व स्मार्ट ओपीडी क्यू के साथ सुरक्षित अस्पताल प्लेटफ़ॉर्म",
    "hero.title1": "विश्वसनीय चिकित्सा सेवा,",
    "hero.title2": "अब आपके एक क्लिक पर",
    "hero.subtitle": "अनुभवी डॉक्टरों से जुड़ें, लाइव ओपीडी टोकन व प्रतीक्षा समय देखें, अपॉइंटमेंट बुक करें या सुरक्षित HD वीडियो परामर्श शुरू करें।",
    "hero.findDoctor": "डॉक्टर खोजें",
    "hero.diseaseGuide": "रोग जानकारी",
    "hero.aiCta": "AI स्वास्थ्य सहायक",
    "emergency.prefix": "आपातकालीन सूचना:",
    "emergency.body": "सीने में तेज़ दर्द, सांस लेने में गंभीर कठिनाई या दुर्घटना की स्थिति में तुरंत 112 / 108 पर कॉल करें।",
    "appointments.title": "मेरी अपॉइंटमेंट और परामर्श",
    "appointments.subtitle": "लाइव OPD टोकन नंबर देखें, वीडियो कॉल से जुड़ें, डिजिटल प्रिस्क्रिप्शन और GST बिल डाउनलोड करें।",
    "records.title": "मरीज़ के मेडिकल रिकॉर्ड और ई-प्रिस्क्रिप्शन",
    "records.subtitle": "पिछले परामर्श, QR-सत्यापित डिजिटल प्रिस्क्रिप्शन, एलर्जी विवरण और फ़ॉलो-अप तिथियां देखें।",
    "home.specTitle": "चिकित्सा विशेषज्ञता के अनुसार डॉक्टर खोजें",
    "home.specSub": "अपनी आवश्यकता के अनुसार विशेषज्ञ चुनें, डॉक्टर की योग्यता देखें और तुरंत अपॉइंटमेंट स्लॉट बुक करें।",
    "home.docsTitle": "उपलब्ध चिकित्सक एवं विशेषज्ञ",
    "home.docsSub": "क्लीनिक विज़िट बुक करें या घर बैठे सुरक्षित HD वीडियो परामर्श शुरू करें।",
    "home.viewAllDocs": "सभी डॉक्टर देखें",
    "home.bookBtn": "परामर्श बुक करें",
    "home.askAiBtn": "AI सहायक से पूछें",
    "doctors.heading": "हमारे चिकित्सा विशेषज्ञों से मिलें",
    "doctors.subheading": "सत्यापित डॉक्टरों, परामर्श शुल्क और उपलब्ध स्लॉट की तुलना कर तुरंत अपॉइंटमेंट बुक करें।",
  },
};

function resolveLang(req) {
  const queryLang = typeof req.query?.lang === "string" ? req.query.lang.toLowerCase() : "";
  if (queryLang === "hi" || queryLang === "en") return queryLang;
  const cookieLang = typeof req.cookies?.onelife_lang === "string" ? req.cookies.onelife_lang.toLowerCase() : "";
  return cookieLang === "hi" ? "hi" : "en";
}

function translate(lang, key, fallback = "") {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || fallback || key;
}

function i18nMiddleware(req, res, next) {
  const lang = resolveLang(req);
  if (req.query?.lang === "hi" || req.query?.lang === "en") {
    res.cookie("onelife_lang", lang, { sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  res.locals.lang = lang;
  res.locals.t = (key, fallback = "") => translate(lang, key, fallback);
  next();
}

module.exports = {
  TRANSLATIONS,
  i18nMiddleware,
  resolveLang,
  translate,
};
