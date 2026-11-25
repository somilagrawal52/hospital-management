function plain(document) {
  if (!document) return null;
  return typeof document.toObject === "function" ? document.toObject() : document;
}

function pick(source, fields) {
  return fields.reduce((result, field) => {
    if (source[field] !== undefined) result[field] = source[field];
    return result;
  }, {});
}

function adminDoctor(document) {
  return pick(plain(document), ["_id", "fullname", "email", "gender", "number", "speciality", "degree", "experience", "about", "fees", "image", "available", "ratingAverage", "ratingCount"]);
}

function adminAppointment(document) {
  return pick(plain(document), ["_id", "fullname", "email", "number", "doctor", "date", "slotDate", "slotTime", "visitMode", "queueToken", "queueState", "amount", "status", "isOnline", "cancelled", "iscompleted"]);
}

function doctorAppointment(document) {
  return pick(plain(document), ["_id", "fullname", "email", "number", "doctor", "date", "slotDate", "slotTime", "visitMode", "queueToken", "queueState", "status", "isOnline", "cancelled", "iscompleted", "video", "prescriptionId"]);
}

module.exports = { adminAppointment, adminDoctor, doctorAppointment };
