const crypto = require("crypto");
const Appointment = require("../models/appointment");
const { finalizePayment } = require("../services/payment-finalization");
const { webhookVerificationSecret } = require("../services/integrations");

function signatureMatches(rawBody, receivedSignature, secret) {
  if (!receivedSignature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(receivedSignature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

async function razorpayWebhook(req, res) {
  const secret = webhookVerificationSecret();
  if (!secret) return res.status(503).json({ error: "Razorpay webhook is not configured." });

  const rawBody = req.body;
  if (!signatureMatches(rawBody, req.get("x-razorpay-signature"), secret)) {
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid webhook payload." });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return res.status(204).end();
  const appointment = await Appointment.findOne({ "payment.orderId": payment.order_id });
  if (!appointment) return res.status(204).end();

  if (event.event === "payment.captured") {
    if (appointment.payment?.status === "success") return res.status(204).end();
    const conflicting = await Appointment.findOne({
      _id: { $ne: appointment._id },
      docId: appointment.docId,
      date: appointment.date,
      status: { $in: ["pending", "confirmed", "online_requested", "created"] },
    }).select("_id").lean();

    if (conflicting) {
      appointment.payment.paymentId = payment.id;
      appointment.payment.status = "success";
      appointment.payment.reconciledAt = new Date();
      appointment.payment.refundStatus = "eligible";
      appointment.payment.refundAmount = Number(appointment.amount || appointment.payment?.amount || 0);
      appointment.status = "cancelled";
      appointment.cancelled = true;
      appointment.statusHistory.push({ status: "cancelled", source: "webhook_slot_claimed_refund_eligible" });
      await appointment.save();
    } else {
      await finalizePayment(appointment, { paymentId: payment.id, source: "razorpay_webhook" });
    }
  } else if (event.event === "payment.failed" && appointment.payment.status !== "success") {
    appointment.payment.status = "failed";
    appointment.status = "payment_failed";
    appointment.statusHistory.push({ status: "payment_failed", source: "razorpay_webhook" });
    await appointment.save();
  }

  return res.status(204).end();
}

module.exports = { razorpayWebhook, signatureMatches };
