const crypto = require("node:crypto");
const PDFDocument = require("pdfkit");

function generateVerificationCode(visitDate = new Date()) {
  const datePart = new Date(visitDate).toISOString().slice(2, 10).replace(/-/g, "");
  const randPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ONERX-${datePart}-${randPart}`;
}

function formatDateIndia(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildPrescriptionPdfBuffer(prescription) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header Band
    doc.rect(42, 42, 511, 68).fill("#0f172a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("OneLife Hospital & Telehealth", 58, 56);
    doc.font("Helvetica").fontSize(9.5).fillColor("#cbd5e1").text("Digital Clinical Consultation & e-Prescription Record", 58, 80);
    doc.fillColor("#5eead4").font("Helvetica-Bold").fontSize(10).text(`Rx Code: ${prescription.verificationCode}`, 360, 62, { width: 178, align: "right" });
    doc.fillColor("#cbd5e1").font("Helvetica").fontSize(8.5).text(`Issued: ${formatDateIndia(prescription.createdAt || prescription.visitDate)}`, 360, 78, { width: 178, align: "right" });

    let y = 128;

    // Doctor & Patient Columns
    doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(10).text("PRESCRIBING CLINICIAN", 42, y);
    doc.text("PATIENT DETAILS", 310, y);
    y += 16;

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text(`Dr. ${prescription.doctorName}`, 42, y);
    doc.text(`${prescription.patientName}${prescription.patientRelation && prescription.patientRelation !== "Self" ? ` (${prescription.patientRelation})` : ""}`, 310, y);
    y += 15;

    doc.fillColor("#475569").font("Helvetica").fontSize(9.5).text(
      [prescription.doctorDegree, prescription.doctorSpeciality].filter(Boolean).join(" · ") || "Specialist Physician",
      42,
      y,
    );
    doc.text(`Visit Date: ${formatDateIndia(prescription.visitDate)}`, 310, y);
    y += 22;

    if (prescription.allergiesAlert) {
      doc.rect(42, y, 511, 24).fill("#fff1f2");
      doc.fillColor("#be123c").font("Helvetica-Bold").fontSize(9).text(`ALLERGY ALERT: ${prescription.allergiesAlert}`, 52, y + 7, { width: 491 });
      y += 32;
    }

    // Vitals strip
    const vitalsList = [
      prescription.vitals?.bp ? `BP: ${prescription.vitals.bp}` : "",
      prescription.vitals?.pulse ? `Pulse: ${prescription.vitals.pulse}` : "",
      prescription.vitals?.temp ? `Temp: ${prescription.vitals.temp}` : "",
      prescription.vitals?.spo2 ? `SpO2: ${prescription.vitals.spo2}` : "",
      prescription.vitals?.weight ? `Weight: ${prescription.vitals.weight}` : "",
    ].filter(Boolean);

    if (vitalsList.length) {
      doc.rect(42, y, 511, 24).fill("#f1f5f9");
      doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9).text(`Vitals: ${vitalsList.join("   |   ")}`, 52, y + 7, { width: 491 });
      y += 32;
    }

    // Chief complaint & Diagnosis
    if (prescription.chiefComplaint) {
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8.5).text("CHIEF COMPLAINT", 42, y);
      y += 12;
      doc.fillColor("#1e293b").font("Helvetica").fontSize(10).text(prescription.chiefComplaint, 42, y, { width: 511 });
      y = doc.y + 10;
    }

    doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(8.5).text("CLINICAL DIAGNOSIS / ASSESSMENT", 42, y);
    y += 12;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10.5).text(prescription.diagnosis, 42, y, { width: 511 });
    y = doc.y + 16;

    // Rx Table Header
    doc.rect(42, y, 511, 22).fill("#e2e8f0");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
    doc.text("#", 48, y + 6, { width: 20 });
    doc.text("MEDICINE / FORMULATION", 68, y + 6, { width: 175 });
    doc.text("DOSAGE", 248, y + 6, { width: 70 });
    doc.text("REGIMEN", 320, y + 6, { width: 85 });
    doc.text("DURATION / TIMING", 408, y + 6, { width: 140 });
    y += 28;

    (prescription.medicines || []).forEach((med, idx) => {
      if (y > 700) {
        doc.addPage();
        y = 48;
      }
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9.5).text(`${idx + 1}.`, 48, y, { width: 20 });
      doc.text(med.name, 68, y, { width: 175 });
      doc.font("Helvetica").fontSize(9).fillColor("#334155");
      doc.text(med.dosage || "—", 248, y, { width: 70 });
      doc.text(med.frequency || "1-0-1", 320, y, { width: 85 });
      doc.text([med.duration, med.timing].filter(Boolean).join(" · "), 408, y, { width: 140 });
      y = Math.max(doc.y, y + 14);
      if (med.instructions) {
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#64748b").text(`Note: ${med.instructions}`, 68, y + 1, { width: 475 });
        y = doc.y + 4;
      }
      doc.moveTo(42, y + 4).lineTo(553, y + 4).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      y += 10;
    });

    if (prescription.labTests?.length) {
      y += 6;
      doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(9).text("RECOMMENDED INVESTIGATIONS / LAB TESTS", 42, y);
      y += 14;
      doc.fillColor("#1e293b").font("Helvetica").fontSize(9.5).text(prescription.labTests.map((t, i) => `${i + 1}. ${t}`).join("   |   "), 42, y, { width: 511 });
      y = doc.y + 12;
    }

    if (prescription.advice) {
      doc.fillColor("#0f766e").font("Helvetica-Bold").fontSize(9).text("CLINICAL ADVICE & PRECAUTIONS", 42, y);
      y += 13;
      doc.fillColor("#1e293b").font("Helvetica").fontSize(9.5).text(prescription.advice, 42, y, { width: 511 });
      y = doc.y + 12;
    }

    if (prescription.followUpDate) {
      doc.rect(42, y, 511, 24).fill("#ecfdf5");
      doc.fillColor("#047857").font("Helvetica-Bold").fontSize(9.5).text(`Follow-up Visit Recommended On: ${formatDateIndia(prescription.followUpDate)}`, 52, y + 7);
      y += 32;
    }

    // Verification footer
    const footerY = Math.max(y + 16, 735);
    doc.moveTo(42, footerY).lineTo(553, footerY).strokeColor("#cbd5e1").lineWidth(0.8).stroke();
    doc.fillColor("#475569").font("Helvetica").fontSize(8).text(
      `Digitally signed via OneLife Clinician Workspace · Verification Code: ${prescription.verificationCode} · Verify authenticity online at /rx/verify/${prescription.verificationCode}`,
      42,
      footerY + 8,
      { width: 511, align: "center" },
    );

    doc.end();
  });
}

module.exports = {
  buildPrescriptionPdfBuffer,
  generateVerificationCode,
};
