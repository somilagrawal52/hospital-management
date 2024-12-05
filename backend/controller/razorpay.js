const fs = require("fs");
const Razorpay = require("razorpay");
const path = require("path");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    const order = await instance.orders.create({
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

  const secret = instance.key_secret;
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
  const frontendDoctor = path.resolve(
    __dirname,
    "..",
    "..",
    "frontend",
    "doctor"
  );
  return res.sendFile(path.join(frontendDoctor, "pages-error-404.html"));
}

module.exports = {
  appointmentcreated,
  verifypayment,
  payemntsuccessfull,
};
