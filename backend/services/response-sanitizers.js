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
  return pick(plain(document), ["_id", "fullname", "email", "gender", "number", "speciality", "degree", "experience", "about", "fees", "image", "available"]);
}

function adminAppointment(document) {
  return pick(plain(document), ["_id", "fullname", "email", "number", "doctor", "date", "slotDate", "slotTime", "amount", "status", "isOnline", "cancelled", "iscompleted"]);
}

function doctorAppointment(document) {
  return pick(plain(document), ["_id", "fullname", "email", "number", "doctor", "date", "slotDate", "slotTime", "status", "isOnline", "cancelled", "iscompleted", "video"]);
}

module.exports = { adminAppointment, adminDoctor, doctorAppointment };
