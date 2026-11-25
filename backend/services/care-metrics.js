const { localDateKey } = require("./scheduling");

function computeOperationalAnalytics(appointments = [], doctors = []) {
  const today = localDateKey(new Date());
  const summary = {
    totalRevenueInr: 0,
    completedCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    pendingCount: 0,
    telehealthCount: 0,
    clinicCount: 0,
    walkInCount: 0,
    todayQueueTotal: 0,
    noShowCount: 0,
    completionRate: 0,
    specialityBreakdown: [],
  };

  const docSpecialityById = new Map(
    (doctors || []).map((doc) => [String(doc._id), doc.speciality || "General"]),
  );
  const specialityCounts = new Map();

  for (const appt of appointments) {
    const status = appt.status || "pending";
    const visitMode = appt.visitMode || (appt.isOnline ? "telehealth" : "clinic");
    const slotDate = appt.slotDate || (appt.date ? localDateKey(appt.date) : "");

    if (appt.payment?.status === "success" && status !== "cancelled") {
      summary.totalRevenueInr += Number(appt.amount || appt.payment?.amount || 0);
    }

    if (status === "completed") summary.completedCount += 1;
    else if (status === "cancelled") summary.cancelledCount += 1;
    else if (status === "confirmed" || status === "online_requested") summary.confirmedCount += 1;
    else summary.pendingCount += 1;

    if (appt.queueState === "no_show") summary.noShowCount += 1;

    if (status !== "cancelled" && status !== "payment_failed") {
      if (visitMode === "telehealth") summary.telehealthCount += 1;
      else if (visitMode === "walk_in") summary.walkInCount += 1;
      else summary.clinicCount += 1;

      if (slotDate === today) summary.todayQueueTotal += 1;
    }

    const spec = appt.doctordata?.speciality || docSpecialityById.get(String(appt.doctorId || appt.docId)) || "General";
    specialityCounts.set(spec, (specialityCounts.get(spec) || 0) + 1);
  }

  const settled = summary.completedCount + summary.cancelledCount;
  summary.completionRate = settled > 0 ? Math.round((summary.completedCount / settled) * 100) : 100;

  const totalSpec = Math.max(1, appointments.length);
  summary.specialityBreakdown = [...specialityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / totalSpec) * 100),
    }));

  return summary;
}

module.exports = { computeOperationalAnalytics };
