// Explicit opt-in demo showcase seeder for fresh commercial evaluation environments.
// Refuses isolated staging environments or invocations without ONELIFE_DEMO_SEED=yes.
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/user");
const Appointment = require("../models/appointment");
const Prescription = require("../models/prescription");
const Review = require("../models/review");
const { localDateKey } = require("../services/scheduling");
const { generateVerificationCode } = require("../services/prescription-pdf");

async function main() {
  if (process.env.APP_ENV === "staging") {
    throw new Error("Refusing to seed commercial demo data into an isolated staging environment.");
  }
  if (process.env.ONELIFE_DEMO_SEED !== "yes") {
    throw new Error("Set ONELIFE_DEMO_SEED=yes to confirm seeding demo showcase records.");
  }

  const uri = process.env.DATABASE_URL || process.env.database_url || "mongodb://127.0.0.1:27017/birlasoft2";
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const adminEmail = "somilagrawal2004@gmail.com";
  const primaryDoctorEmail = "agrawalsomil67@gmail.com";
  const patientEmail = "sample@gmail.com";

  if (!(await User.exists({ email: adminEmail }))) {
    await User.create({
      fullname: "Somil Agrawal (Admin)",
      email: adminEmail,
      password: "admin123",
      role: "ADMIN",
      number: "9399304021",
      country: "India",
    });
  }

  const demoDoctors = [
    {
      fullname: "Somil Agrawal",
      email: primaryDoctorEmail,
      password: "doctor123",
      speciality: "Neurologist",
      degree: "MBBS, MD, DM (Neurology)",
      experience: "8",
      fees: 800,
      about: "Senior consultant neurologist specializing in migraine prevention, stroke recovery, and epilepsy management.",
      image: "/assets/doc1.png",
    },
    {
      fullname: "Priya Deshmukh",
      email: "priya.deshmukh@onelife.demo",
      password: "doctor123",
      speciality: "General physician",
      degree: "MBBS, MD (Internal Medicine)",
      experience: "10",
      fees: 500,
      about: "Primary care specialist managing diabetes, hypertension, seasonal fevers (dengue/typhoid), and preventive wellness.",
      image: "/assets/doc2.png",
    },
    {
      fullname: "Anjali Nair",
      email: "anjali.nair@onelife.demo",
      password: "doctor123",
      speciality: "Gynecologist",
      degree: "MBBS, MS (OBG)",
      experience: "9",
      fees: 700,
      about: "Women's reproductive health, PCOS metabolic care, high-risk obstetrics, and telehealth prenatal follow-ups.",
      image: "/assets/doc3.png",
    },
    {
      fullname: "Rohan Verma",
      email: "rohan.verma@onelife.demo",
      password: "doctor123",
      speciality: "Dermatologist",
      degree: "MBBS, MD (Dermatology)",
      experience: "6",
      fees: 600,
      about: "Clinical dermatology for acne, eczema, fungal infections, pediatric skin allergy, and hair health.",
      image: "/assets/doc4.png",
    },
    {
      fullname: "Meera Krishnan",
      email: "meera.krishnan@onelife.demo",
      password: "doctor123",
      speciality: "Pediatricians",
      degree: "MBBS, MD (Pediatrics)",
      experience: "11",
      fees: 550,
      about: "Child development, immunization schedules, childhood respiratory allergies, and fever triage.",
      image: "/assets/doc5.png",
    },
    {
      fullname: "Vikram Kulkarni",
      email: "vikram.kulkarni@onelife.demo",
      password: "doctor123",
      speciality: "Gastroenterologist",
      degree: "MBBS, DM (Gastroenterology)",
      experience: "12",
      fees: 850,
      about: "Digestive health, liver wellness, GERD management, and IBS dietary protocols.",
      image: "/assets/doc6.png",
    },
  ];

  const doctorMap = {};
  for (const row of demoDoctors) {
    let doc = await User.findOne({ email: row.email });
    if (!doc) {
      doc = await User.create({
        ...row,
        role: "DOCTOR",
        gender: "Female",
        number: "9876543210",
        available: true,
        address: { line1: "OneLife Central Hospital, Wing A", line2: "Satna, Madhya Pradesh 485001" },
      });
    }
    doctorMap[row.email] = doc;
  }

  let patient = await User.findOne({ email: patientEmail });
  if (!patient) {
    patient = await User.create({
      fullname: "Ananya Kapoor",
      email: patientEmail,
      password: "password123",
      role: "NORMAL",
      gender: "Female",
      dob: "1995-05-14",
      number: "9876501234",
      bloodGroup: "O+",
      allergies: "Penicillin",
      chronicConditions: "Occasional Migraine",
      address: { line1: "24 Civil Lines", line2: "Satna, MP" },
      dependents: [
        {
          fullname: "Ramesh Kapoor",
          relation: "Parent",
          gender: "Male",
          dob: "1962-08-19",
          bloodGroup: "B+",
          allergies: "Sulfa drugs",
          chronicConditions: "Type 2 Diabetes, Hypertension",
        },
      ],
    });
  }

  const neurologist = doctorMap[primaryDoctorEmail];
  const existingRxCount = await Prescription.countDocuments({ patientId: patient._id });

  if (!existingRxCount && neurologist) {
    const pastDate = new Date(Date.now() - 3 * 86400000);
    const pastAppt = await Appointment.create({
      userid: String(patient._id),
      patientId: patient._id,
      fullname: patient.fullname,
      email: patient.email,
      number: patient.number || "9876501234",
      address: patient.address || { line1: "24 Civil Lines", line2: "Satna, MP" },
      docId: String(neurologist._id),
      doctorId: neurologist._id,
      doctor: neurologist.fullname,
      visitMode: "telehealth",
      isOnline: true,
      date: pastDate,
      slotDate: localDateKey(pastDate),
      slotTime: "10:30",
      queueToken: 1,
      queueState: "completed",
      amount: neurologist.fees || 800,
      userdata: { fullname: patient.fullname, email: patient.email },
      doctordata: { fullname: neurologist.fullname, speciality: neurologist.speciality, degree: neurologist.degree, image: neurologist.image },
      payment: { orderId: "demo_order_completed_1", paymentId: "demo_pay_completed_1", amount: neurologist.fees || 800, currency: "INR", status: "success" },
      status: "completed",
      iscompleted: true,
    });

    const rx = await Prescription.create({
      appointmentId: pastAppt._id,
      patientId: patient._id,
      doctorId: neurologist._id,
      patientName: patient.fullname,
      doctorName: neurologist.fullname,
      doctorSpeciality: neurologist.speciality,
      doctorDegree: neurologist.degree,
      visitDate: pastDate,
      verificationCode: generateVerificationCode(pastDate),
      chiefComplaint: "Throbbing unilateral headache with light sensitivity",
      diagnosis: "Episodic Migraine without Aura",
      allergiesAlert: "Penicillin",
      vitals: { bp: "118/76", pulse: "74", temp: "98.4", spo2: "99%" },
      medicines: [
        { name: "Tab. Naproxen", dosage: "500 mg", frequency: "SOS", timing: "After food", duration: "5 days", instructions: "Take at headache onset" },
        { name: "Tab. Pantoprazole", dosage: "40 mg", frequency: "1-0-0", timing: "Empty stomach", duration: "5 days" },
      ],
      labTests: ["Vitamin D3", "Complete Blood Count (CBC)"],
      advice: "Maintain hydration (2.5L/day), regular sleep hours, and minimize screen glare.",
      followUpDate: localDateKey(new Date(Date.now() + 7 * 86400000)),
    });

    const review = await Review.create({
      appointmentId: pastAppt._id,
      patientId: patient._id,
      doctorId: neurologist._id,
      patientName: patient.fullname,
      rating: 5,
      punctualityRating: 5,
      comment: "Crystal clear video consult, thorough intake review, and instant digital Rx.",
      visitMode: "telehealth",
    });

    pastAppt.prescriptionId = rx._id;
    pastAppt.reviewId = review._id;
    await pastAppt.save();

    await User.findByIdAndUpdate(neurologist._id, { ratingAverage: 5, ratingCount: 1 });
  }

  console.log("Commercial showcase seed complete.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
