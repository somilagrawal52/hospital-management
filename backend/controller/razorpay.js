const fs = require("fs");
const path = require("path");
const { razorpayClient } = require("../services/razorpay-client");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const readData = () => {
  if (fs.existsSync("orders.json")) {
    const data = fs.readFileSync("orders.json");
    return JSON.parse(data);
  }
  return [];
};

const writeData = (data) => {
  fs.writeFileSync("orders.json", JSON.stringify(data, null, 2));
};

async function appointmentcreated(req, res) {
  try {
    const { amount } = req.body;
    const order = await razorpayClient().orders.create({
      amount: amount * 100, // Amount in paisa
      currency: "INR",
    });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating order");
  }
}

async function verifypayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );
    if (isValidSignature) {
      const orders = readData();
      const order = orders.find((o) => o.order_id === razorpay_order_id);
      if (order) {
        order.status = "paid";
        order.payment_id = razorpay_payment_id;
        writeData(orders);
      }
      res.status(200).json({ status: "ok" });
      console.log("Payment verification successful");
    } else {
      res.status(400).json({ status: "verification_failed" });
      console.log("Payment verification failed");
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "error", message: "Error verifying payment" });
  }
}

async function payemntsuccessfull(req, res) {
  return res.render("payment-success", {
    transactionId: req.query.paymentId || req.query.transactionId || "",
  });
}

module.exports = {
  appointmentcreated,
  verifypayment,
  payemntsuccessfull,
};
