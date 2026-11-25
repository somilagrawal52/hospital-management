const mongoose = require("mongoose");
const Appointment = require("../models/appointment");
const Prescription = require("../models/prescription");
const Review = require("../models/review");
const User = require("../models/user");
const { mailsender } = require("./mail");
const { localDateKey } = require("../services/scheduling");
const { assignQueueTokenForAppointment } = require("../services/opd-queue");
const { buildPrescriptionPdfBuffer, generateVerificationCode } = require("../services/prescription-pdf");
const { formatAppointmentDate } = require("../services/payment-finalization");

function maskPatientName(fullname = "") {
  const parts = String(fullname || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Patient";
  return parts
    .map((part) => (part.length <= 2 ? `${part[0]}*` : `${part.slice(0, 2)}${"*".repeat(Math.min(4, part.length - 2))}`))
    .join(" ");
}

function parseMedicinesPayload(body) {
  if (Array.isArray(body.medicines)) {
    return body.medicines
      .map((item) => ({
        name: String(item?.name || "").trim(),
        dosage: String(item?.dosage || "").trim(),
        frequency: String(item?.frequency || "1-0-1").trim(),
        timing: String(item?.timing || "After food").trim(),
        duration: String(item?.duration || "5 days").trim(),
        instructions: String(item?.instructions || "").trim(),
      }))
      .filter((item) => item.name);
  }

  const names = [].concat(body.medName || []);
  const dosages = [].concat(body.medDosage || []);
  const freqs = [].concat(body.medFrequency || []);
  const timings = [].concat(body.medTiming || []);
  const durations = [].concat(body.medDuration || []);
  const notes = [].concat(body.medInstructions || []);

  return names
    .map((name, idx) => ({
      name: String(name || "").trim(),
      dosage: String(dosages[idx] || "").trim(),
      frequency: String(freqs[idx] || "1-0-1").trim(),
      timing: String(timings[idx] || "After food").trim(),
      duration: String(durations[idx] || "5 days").trim(),
      instructions: String(notes[idx] || "").trim(),
    }))
    .filter((item) => item.name);
}

async function addDependent(req, res) {
  try {
    const { fullname, relation, gender, dob, bloodGroup, allergies, chronicConditions } = req.body;
    if (!fullname?.trim()) {
      return res.status(400).json({ success: false, message: "Enter the family member's full name." });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Account not found." });
    if ((user.dependents || []).length >= 8) {
      return res.status(400).json({ success: false, message: "You can save up to 8 family profiles." });
    }
    user.dependents.push({
      fullname: fullname.trim(),
      relation: ["Parent", "Spouse", "Child", "Sibling", "Other"].includes(relation) ? relation : "Other",
      gender: ["Male", "Female", "Other", ""].includes(gender) ? gender : "",
      dob: String(dob || "").trim(),
      bloodGroup: String(bloodGroup || "").trim(),
      allergies: String(allergies || "").trim(),
      chronicConditions: String(chronicConditions || "").trim(),
    });
    await user.save();
    return res.json({ success: true, dependents: user.dependents, message: "Family member profile saved." });
  } catch (error) {
    console.error("Failed adding family member:", error);
    return res.status(500).json({ success: false, message: "Unable to save family member profile." });
  }
}

async function removeDependent(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { dependents: { _id: id } } },
      { new: true },
    ).select("dependents");
    if (!user) return res.status(404).json({ success: false, message: "Account not found." });
    return res.json({ success: true, dependents: user.dependents, message: "Family profile removed." });
  } catch (error) {
    console.error("Failed removing family member:", error);
    return res.status(500).json({ success: false, message: "Unable to remove family profile." });
  }
}

async function updateAppointmentIntake(req, res) {
  try {
    const { chiefComplaint, symptomDuration, allergies, currentMedications, bp, temp, spo2, weight } = req.body;
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      $or: [{ patientId: req.user._id }, { userid: String(req.user._id) }],
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    if (["cancelled", "payment_failed"].includes(appointment.status)) {
      return res.status(409).json({ success: false, message: "This appointment is closed." });
    }

    appointment.intake = {
      chiefComplaint: String(chiefComplaint || "").trim().slice(0, 800),
      symptomDuration: String(symptomDuration || "").trim().slice(0, 120),
      allergies: String(allergies || "").trim().slice(0, 500),
      currentMedications: String(currentMedications || "").trim().slice(0, 500),
      vitals: {
        bp: String(bp || "").trim().slice(0, 40),
        temp: String(temp || "").trim().slice(0, 40),
        spo2: String(spo2 || "").trim().slice(0, 40),
        weight: String(weight || "").trim().slice(0, 40),
      },
      submittedAt: new Date(),
    };
    await appointment.save();
    return res.json({ success: true, message: "Clinical intake brief saved for your doctor." });
  } catch (error) {
    console.error("Unable to update intake:", error);
    return res.status(500).json({ success: false, message: "Unable to save clinical intake." });
  }
}

async function consultWorkspacePage(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).render("error-404", { title: "Appointment Not Found", message: "Invalid appointment identifier." });
    }
    const [doctor, appointment] = await Promise.all([
      User.findById(req.user._id).select("-password").lean(),
      Appointment.findById(req.params.id).lean(),
    ]);
    if (!appointment || appointment.docId !== String(req.user._id)) {
      return res.status(404).render("error-404", { title: "Consultation Not Found", message: "This consultation is not assigned to you." });
    }
    const [prescription, priorPrescriptions, patientAccount] = await Promise.all([
      Prescription.findOne({ appointmentId: appointment._id }).lean(),
      Prescription.find({ patientId: appointment.patientId || appointment.userid, doctorId: req.user._id })
        .sort({ visitDate: -1 })
        .limit(5)
        .lean(),
      mongoose.isValidObjectId(appointment.userid)
        ? User.findById(appointment.userid).select("bloodGroup allergies chronicConditions abhaId emergencyContact dob gender").lean()
        : null,
    ]);

    return res.render("doctor-consult", {
      doctor,
      appointment,
      patientAccount,
      prescription,
      priorPrescriptions,
      formattedDate: formatAppointmentDate(appointment.date),
      saved: req.query.saved === "1",
    });
  } catch (error) {
    console.error("Error loading consultation workspace:", error);
    return res.status(500).send("Unable to load consultation workspace.");
  }
}

async function savePrescription(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    const [doctor, appointment] = await Promise.all([
      User.findById(req.user._id).select("fullname speciality degree").lean(),
      Appointment.findById(req.params.id),
    ]);
    if (!appointment || appointment.docId !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: "Consultation not found." });
    }

    const diagnosis = String(req.body.diagnosis || "").trim();
    const medicines = parseMedicinesPayload(req.body);
    if (!diagnosis || !medicines.length) {
      return res.status(400).json({ success: false, message: "Enter a clinical diagnosis and at least one medicine." });
    }

    const labTests = String(req.body.labTests || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);

    const vitals = {
      bp: String(req.body.bp || "").trim(),
      pulse: String(req.body.pulse || "").trim(),
      temp: String(req.body.temp || "").trim(),
      spo2: String(req.body.spo2 || "").trim(),
      weight: String(req.body.weight || "").trim(),
    };

    const existing = await Prescription.findOne({ appointmentId: appointment._id });
    const prescriptionPayload = {
      appointmentId: appointment._id,
      patientId: appointment.patientId || appointment.userid,
      doctorId: req.user._id,
      patientName: appointment.patientMember?.fullname || appointment.fullname,
      patientRelation: appointment.patientMember?.relation || "Self",
      doctorName: doctor.fullname || appointment.doctor,
      doctorSpeciality: doctor.speciality || appointment.doctordata?.speciality || "",
      doctorDegree: doctor.degree || appointment.doctordata?.degree || "",
      visitDate: appointment.date,
      chiefComplaint: String(req.body.chiefComplaint || appointment.intake?.chiefComplaint || "").trim(),
      diagnosis,
      allergiesAlert: String(req.body.allergiesAlert || appointment.intake?.allergies || "").trim(),
      vitals,
      medicines,
      labTests,
      advice: String(req.body.advice || "").trim(),
      followUpDate: /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.followUpDate || "")) ? String(req.body.followUpDate) : "",
    };

    let prescription;
    if (existing) {
      Object.assign(existing, prescriptionPayload);
      prescription = await existing.save();
    } else {
      prescription = await Prescription.create({
        ...prescriptionPayload,
        verificationCode: generateVerificationCode(appointment.date),
      });
    }

    appointment.prescriptionId = prescription._id;
    if (req.body.markCompleted === true || req.body.markCompleted === "true" || req.body.markCompleted === "1") {
      appointment.status = "completed";
      appointment.iscompleted = true;
      appointment.queueState = "completed";
      appointment.statusHistory.push({ status: "completed", changedBy: req.user._id, source: "doctor_consult_rx" });
      if (appointment.queueToken) {
        const slotDate = appointment.slotDate || localDateKey(appointment.date);
        await User.findByIdAndUpdate(req.user._id, {
          "queueStatus.date": slotDate,
          "queueStatus.currentToken": appointment.queueToken,
          "queueStatus.updatedAt": new Date(),
        });
      }
    }
    await appointment.save();

    if (appointment.email) {
      mailsender({
        to: appointment.email,
        subject: `Your Digital e-Prescription from Dr. ${prescription.doctorName} (${prescription.verificationCode})`,
        text: `Hello ${prescription.patientName},\n\nDr. ${prescription.doctorName} has issued your digital prescription (Verification Code: ${prescription.verificationCode}).\nDiagnosis: ${prescription.diagnosis}\nYou can download the PDF from your OneLife Health Records or My Appointments page.`,
      }).catch((err) => console.error("Prescription notice email failed:", err?.message));
    }

    return res.json({
      success: true,
      prescriptionId: prescription._id,
      verificationCode: prescription.verificationCode,
      message: "Digital e-Prescription saved.",
    });
  } catch (error) {
    console.error("Failed saving prescription:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to save e-Prescription." });
  }
}

async function downloadPrescriptionPdf(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).send("Prescription not found.");
    }
    const prescription = await Prescription.findById(req.params.id).lean();
    if (!prescription) return res.status(404).send("Prescription not found.");

    const isOwner =
      req.user.role === "ADMIN" ||
      String(prescription.patientId) === String(req.user._id) ||
      String(prescription.doctorId) === String(req.user._id);
    if (!isOwner) return res.status(404).send("Prescription not found.");

    const pdfBuffer = await buildPrescriptionPdfBuffer(prescription);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="onelife-rx-${prescription.verificationCode}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating prescription PDF:", error);
    return res.status(500).send("Unable to generate prescription PDF.");
  }
}

async function verifyPrescriptionPage(req, res) {
  const code = String(req.params.code || req.query.code || "").trim().toUpperCase();
  let record = null;
  if (code) {
    const found = await Prescription.findOne({ verificationCode: code }).lean();
    if (found) {
      record = {
        verificationCode: found.verificationCode,
        doctorName: found.doctorName,
        doctorDegree: found.doctorDegree,
        doctorSpeciality: found.doctorSpeciality,
        patientMasked: maskPatientName(found.patientName),
        visitDateFormatted: formatAppointmentDate(found.visitDate),
        medicinesCount: (found.medicines || []).length,
        medicines: (found.medicines || []).map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        })),
      };
    }
  }
  return res.render("rx-verify", {
    code,
    record,
    user: req.user || null,
    patientdata: null,
  });
}

async function healthRecordsPage(req, res) {
  try {
    const [patientdata, prescriptions, completedAppointments] = await Promise.all([
      User.findById(req.user._id).select("-password").lean(),
      Prescription.find({ patientId: req.user._id }).sort({ visitDate: -1 }).lean(),
      Appointment.find({ userid: String(req.user._id), status: "completed" }).sort({ date: -1 }).lean(),
    ]);

    const formattedPrescriptions = prescriptions.map((rx) => ({
      ...rx,
      formattedDate: formatAppointmentDate(rx.visitDate),
    }));

    return res.render("health-records", {
      user: req.user,
      patientdata,
      prescriptions: formattedPrescriptions,
      completedCount: completedAppointments.length,
    });
  } catch (error) {
    console.error("Error loading patient health records:", error);
    return res.status(500).send("Unable to load health records.");
  }
}

async function updateDoctorQueue(req, res) {
  try {
    const { action, appointmentId, delayMinutes, delayReason, queueState } = req.body;
    const today = localDateKey(new Date());

    if (action === "broadcast_delay") {
      const minutes = Math.max(0, Math.min(240, Number(delayMinutes || 0)));
      const reason = String(delayReason || "").trim().slice(0, 200);
      await User.findByIdAndUpdate(req.user._id, {
        "queueStatus.date": today,
        "queueStatus.delayMinutes": minutes,
        "queueStatus.delayReason": minutes > 0 ? reason || "Clinic running behind schedule" : "",
        "queueStatus.updatedAt": new Date(),
      });

      if (minutes > 0) {
        const waitingToday = await Appointment.find({
          docId: String(req.user._id),
          slotDate: today,
          status: { $in: ["confirmed", "online_requested"] },
          queueState: { $in: ["waiting", "checked_in"] },
        }).select("email fullname doctor queueToken").lean();

        Promise.allSettled(
          waitingToday
            .filter((row) => row.email)
            .map((row) =>
              mailsender({
                to: row.email,
                subject: `Schedule Update: Dr. ${row.doctor} running ~${minutes} mins late`,
                text: `Hello ${row.fullname}, Dr. ${row.doctor}'s clinic queue has an estimated delay of ${minutes} minutes${reason ? ` (${reason})` : ""}.${row.queueToken ? ` Your token #${row.queueToken} remains active.` : ""} Check live queue ETA on OneLife My Appointments.`,
              }),
            ),
        ).catch(() => {});
      }

      return res.json({ success: true, delayMinutes: minutes, message: minutes > 0 ? `Delay of ${minutes} min broadcast to waiting patients.` : "Doctor schedule marked back on time." });
    }

    if (action === "call_next") {
      const nextWaiting = await Appointment.findOne({
        docId: String(req.user._id),
        slotDate: today,
        status: { $in: ["confirmed", "online_requested"] },
        queueState: { $in: ["waiting", "checked_in"] },
      }).sort({ queueToken: 1, date: 1 });

      if (!nextWaiting) {
        return res.status(404).json({ success: false, message: "No remaining patients waiting in today's OPD queue." });
      }
      await assignQueueTokenForAppointment(nextWaiting);
      nextWaiting.queueState = "in_consultation";
      nextWaiting.checkedInAt ||= new Date();
      await nextWaiting.save();

      await User.findByIdAndUpdate(req.user._id, {
        "queueStatus.date": today,
        "queueStatus.currentToken": nextWaiting.queueToken || 1,
        "queueStatus.updatedAt": new Date(),
      });

      return res.json({
        success: true,
        currentToken: nextWaiting.queueToken,
        patientName: nextWaiting.patientMember?.fullname || nextWaiting.fullname,
        message: `Now serving Token #${nextWaiting.queueToken} (${nextWaiting.patientMember?.fullname || nextWaiting.fullname}).`,
      });
    }

    if (appointmentId && ["waiting", "checked_in", "called", "in_consultation", "completed", "no_show"].includes(queueState)) {
      const appt = await Appointment.findById(appointmentId);
      if (!appt || appt.docId !== String(req.user._id)) {
        return res.status(404).json({ success: false, message: "Appointment not found." });
      }
      await assignQueueTokenForAppointment(appt);
      appt.queueState = queueState;
      if (queueState === "checked_in" || queueState === "in_consultation") appt.checkedInAt ||= new Date();
      if (queueState === "completed") {
        appt.status = "completed";
        appt.iscompleted = true;
        appt.statusHistory.push({ status: "completed", changedBy: req.user._id, source: "opd_queue" });
      }
      await appt.save();

      if ((queueState === "called" || queueState === "in_consultation") && appt.queueToken) {
        await User.findByIdAndUpdate(req.user._id, {
          "queueStatus.date": appt.slotDate || today,
          "queueStatus.currentToken": appt.queueToken,
          "queueStatus.updatedAt": new Date(),
        });
      }

      return res.json({ success: true, queueState, token: appt.queueToken, message: `Token #${appt.queueToken || "—"} updated to ${queueState.replace(/_/g, " ")}.` });
    }

    return res.status(400).json({ success: false, message: "Invalid queue action." });
  } catch (error) {
    console.error("Queue update failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update OPD queue." });
  }
}

async function createWalkInAppointment(req, res) {
  try {
    const { doctorId, fullname, number, email, chiefComplaint, paymentMethod } = req.body;
    if (!mongoose.isValidObjectId(doctorId) || !fullname?.trim() || !number?.trim()) {
      return res.status(400).json({ success: false, message: "Select a doctor and enter patient name and phone number." });
    }
    const doctor = await User.findOne({ _id: doctorId, role: "DOCTOR" }).select("-password").lean();
    if (!doctor) return res.status(404).json({ success: false, message: "Selected doctor was not found." });

    const now = new Date();
    const today = localDateKey(now);
    const slotTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const fee = Number(doctor.fees || 500);
    const walkInEmail = email?.trim().toLowerCase() || `walkin-${Date.now()}@desk.onelife.local`;

    const appointment = new Appointment({
      userid: `walkin_${Date.now()}`,
      fullname: fullname.trim(),
      email: walkInEmail,
      number: number.trim(),
      address: { line1: "OPD Reception Desk", line2: "Walk-In Registration" },
      docId: String(doctor._id),
      doctorId: doctor._id,
      doctor: doctor.fullname,
      visitMode: "walk_in",
      isOnline: false,
      date: now,
      slotDate: today,
      slotTime,
      queueState: "checked_in",
      checkedInAt: now,
      intake: {
        chiefComplaint: String(chiefComplaint || "OPD Walk-in Consultation").trim().slice(0, 800),
        submittedAt: now,
      },
      payment: {
        orderId: `walkin_${paymentMethod === "upi" ? "upi" : "cash"}_${Date.now()}`,
        amount: fee,
        currency: "INR",
        status: "success",
        paymentId: `DESK-${Date.now().toString().slice(-6)}`,
        reconciledAt: now,
      },
      amount: fee,
      userdata: { fullname: fullname.trim(), number: number.trim(), email: walkInEmail },
      doctordata: { fullname: doctor.fullname, speciality: doctor.speciality, degree: doctor.degree, image: doctor.image },
      status: "confirmed",
      statusHistory: [{ status: "confirmed", changedBy: req.user._id, source: "admin_walk_in" }],
    });

    await assignQueueTokenForAppointment(appointment);
    await appointment.save();

    if (req.xhr || req.headers.accept?.includes("application/json") || req.get("x-csrf-token")) {
      return res.json({
        success: true,
        appointmentId: appointment._id,
        token: appointment.queueToken,
        message: `Walk-in Token #${appointment.queueToken} issued for Dr. ${doctor.fullname}.`,
      });
    }
    return res.redirect("/admin");
  } catch (error) {
    console.error("Walk-in registration error:", error);
    return res.status(500).json({ success: false, message: "Unable to register walk-in token." });
  }
}

async function submitDoctorReview(req, res) {
  try {
    const rating = Number(req.body.rating);
    const punctualityRating = Number(req.body.punctualityRating || rating);
    const comment = String(req.body.comment || "").trim().slice(0, 600);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Choose a star rating from 1 to 5." });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      $or: [{ patientId: req.user._id }, { userid: String(req.user._id) }],
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    if (appointment.status !== "completed") {
      return res.status(409).json({ success: false, message: "Reviews can only be submitted after completing a consultation." });
    }
    if (appointment.reviewId) {
      return res.status(409).json({ success: false, message: "You have already reviewed this visit." });
    }

    const patient = await User.findById(req.user._id).select("fullname").lean();
    const doctorId = appointment.doctorId || appointment.docId;

    const review = await Review.create({
      appointmentId: appointment._id,
      patientId: req.user._id,
      doctorId,
      patientName: patient?.fullname || appointment.fullname || "Verified Patient",
      rating,
      punctualityRating: Math.max(1, Math.min(5, Math.round(punctualityRating || rating))),
      comment,
      visitMode: appointment.visitMode || (appointment.isOnline ? "telehealth" : "clinic"),
    });

    appointment.reviewId = review._id;
    await appointment.save();

    const aggregate = await Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(String(doctorId)) } },
      { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (aggregate.length) {
      await User.findByIdAndUpdate(doctorId, {
        ratingAverage: Math.round(aggregate[0].avg * 10) / 10,
        ratingCount: aggregate[0].count,
      });
    }

    return res.json({ success: true, reviewId: review._id, message: "Thank you for reviewing your verified consultation." });
  } catch (error) {
    console.error("Failed submitting review:", error);
    return res.status(500).json({ success: false, message: "Unable to save review." });
  }
}

module.exports = {
  addDependent,
  consultWorkspacePage,
  createWalkInAppointment,
  downloadPrescriptionPdf,
  healthRecordsPage,
  maskPatientName,
  parseMedicinesPayload,
  removeDependent,
  savePrescription,
  submitDoctorReview,
  updateAppointmentIntake,
  updateDoctorQueue,
  verifyPrescriptionPage,
};
