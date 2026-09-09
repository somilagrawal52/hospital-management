const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Appointment = require("../models/appointment");
const Message = require("../models/messages");
const { mailsender,sendWhatsAppMessage } = require("./mail");
const User = require("../models/user");
// const otpgeneration = require("otp-generator");
const Razorpay = require("razorpay");
const { validatetoken } = require("../services/auth");
const { cookieOptions } = require("../services/auth");
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");
const { doctorImage } = require("../services/doctor-image");



const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function formatAppointmentDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}



async function appointment(req, res) {
  return res.redirect("/");
}

async function register(req, res) {
  return res.render("login", { state: 'register', fullname: '', email: '', password: '' });
}

async function messages(req, res) {
  const token = req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  return res.render("patient-messages", {
    user: req.user,
    patientdata,
    success: req.query.success === "1",
  });
}

async function home(req, res) {
  return res.redirect("/");
}

async function doctors(req, res) {
  return res.redirect("/doctors");
}
// Get all online appointment requests with status "pending"
async function getOnlineAppointmentRequests(req, res) {
  try {
    const onlineAppointments = await Appointment.find({
      status: "online_requested",
      docId: req.user._id,
    }).sort({ date: -1 });

    res.json({ success: true, appointments: onlineAppointments });
  } catch (error) {
    console.error("Error fetching online appointments:", error);
    res.status(500).json({ success: false, message: "Error fetching online appointments" });
  }
}

async function bookappointment(req, res) {
  try {
    const { docId, fullname, email, number, date, time, line1, line2 } = req.body;
    const userid = req.user._id;
    if (!docId || !fullname?.trim() || !email?.trim() || !number?.trim() || !date || !line1?.trim() || !line2?.trim()) {
      return res.status(400).json({ success: false, message: "Please complete all appointment details." });
    }
    const appointmentDate = new Date(`${date}T${time || "09:00"}:00+05:30`);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({ success: false, message: "Choose a future appointment date." });
    }
    const doctordata = await User.findOne({ _id: docId, role: "DOCTOR" }).select("-password");
    if (!doctordata) return res.status(404).json({ success: false, message: "Doctor not found." });
    if (!doctordata.available) return res.status(400).json({ success: false, message: "This doctor is not currently available." });

    const alreadyBooked = await Appointment.exists({ docId, date: appointmentDate, status: { $nin: ["cancelled"] } });
    if (alreadyBooked) return res.status(409).json({ success: false, message: "This appointment slot is no longer available." });
    
    const razorpayOrder = await instance.orders.create({
      // Never trust the fee supplied by the browser.
      amount: Math.round(Number(doctordata.fees) * 100),
      currency: "INR",
    });
    const userdata = await User.findById(userid).select("-password");
    const appointment = new Appointment({
      fullname,
      email,
      number,
      address: { line1, line2 },
      userid,
      docId,
      doctor: doctordata.fullname,
      payment: {
        orderId: razorpayOrder.id,
        amount: doctordata.fees,
        currency: "INR",
        status: "pending",
      },
      date: appointmentDate,
      amount: doctordata.fees,
      userdata,
      doctordata,
        status: "created",
    });

    await appointment.save();

    res.json({
      message: "Appointment created successfully.",
      appointmentId: appointment._id,
      razorpayOrderId: razorpayOrder.id,
      amount: Number(doctordata.fees) * 100,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error booking appointment." });
  }
}

async function aboutpage(req, res) {
  const token=req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  
  return res.render('about',{user:req.user,patientdata});
}

async function appointmentdetailtable(req, res) {
  try {
    const appointments = await Appointment.find({ userid: req.user._id }).sort({ date: -1 });
    res.json({success:true,appointments});
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function sendmsg(req, res) {
  const { fullname, question, msgbody } = req.body;
  console.log(req.body);
  try {
    await Message.create({
      senderId: req.user._id,
      fullname,
      question,
      message: msgbody,
    });
    console.log("Message Send");
    return res.redirect("/messages?success=1");
  } catch (error) {
    console.log(error);
    return res.redirect("/messages");
  }
}

async function messagesdetailtable(req, res) {
  try {
    const messages = await Message.find({});
    res.json(messages);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function myappointments(req,res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const decoded = validatetoken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    const patientdata = await User.findById(decoded._id).select("-password");
    const appointments = await Appointment.find({ userid: decoded._id }).sort({
      date: -1,
    });

    patientdata.appointments = appointments.map((appointmentDoc) => {
      const appointment = appointmentDoc.toObject();
      if (appointment.doctordata) appointment.doctordata.image = doctorImage(appointment.doctordata.image);
      appointment.formattedDate = formatAppointmentDate(appointment.date);
      return appointment;
    });
    patientdata.upcomingAppointmentsCount = patientdata.appointments.filter(
      (item) => item.status === "confirmed" && new Date(item.date) >= new Date(),
    ).length;
    console.log("Patient appointments data:", patientdata.appointments);

    res.render('myAppointment',{user:req.user,patientdata});
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error fetching patient data" });
  }
}

async function savePayments(req, res) {
  const { appointmentId, paymentId, orderId, signature } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment || appointment.userid !== String(req.user._id)) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.payment.status === "success") return res.json({ message: "Payment already verified." });
    if (!paymentId || !signature || orderId !== appointment.payment.orderId) {
      return res.status(400).json({ message: "Invalid payment details." });
    }
    const isValid = validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      process.env.RAZORPAY_KEY_SECRET
    );
    if (!isValid) return res.status(400).json({ message: "Payment verification failed." });

    appointment.payment.paymentId = paymentId;
    appointment.payment.status = "success";
    appointment.status = "confirmed";

    const invoiceDir = path.join(__dirname, "..", "invoices");
    fs.mkdirSync(invoiceDir, { recursive: true });
    const invoiceName = `invoice-${appointment._id}.pdf`;
    const filePath = path.join(invoiceDir, invoiceName);
    await new Promise((resolve, reject) => {
      const document = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      stream.on("finish", resolve).on("error", reject);
      document.pipe(stream);
      document.fontSize(20).text("OneLife appointment invoice");
      document.moveDown().fontSize(12);
      document.text(`Invoice ID: ${appointment.payment.orderId}`);
      document.text(`Patient: ${appointment.fullname}`);
      document.text(`Doctor: Dr. ${appointment.doctor}`);
      document.text(`Appointment: ${formatAppointmentDate(appointment.date)}`);
      document.text(`Amount paid: Rs. ${appointment.amount}`);
      document.end();
    });
    appointment.invoiceFile = invoiceName;

    await appointment.save();

    const doctor = await User.findById(appointment.docId).select("email fullname number");
    await Promise.allSettled([
      mailsender({ to: appointment.email, subject: "Appointment confirmed", text: `Your appointment with Dr. ${appointment.doctor} is confirmed.`, attachments: [{ path: filePath, contentType: "application/pdf" }] }),
      doctor && mailsender({ to: doctor.email, subject: "New confirmed appointment", text: `${appointment.fullname} has a confirmed appointment on ${formatAppointmentDate(appointment.date)}.`, attachments: [{ path: filePath, contentType: "application/pdf" }] }),
    ]);

    res.json({ message: "Payment saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving payment." });
  }
}

async function patientregistrationtodb(req, res) {
  const { fullname, email, password } = req.body;

  try {
    if (!fullname?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || !password || password.length < 8) {
      return res.status(400).render("login", { state: "register", fullname, email, password: "", error: "Enter your name, a valid email, and a password of at least 8 characters." });
    }
    const newPatient = await User.create({
      fullname,
      email,
      password,
    });
    console.log("Patient created successfully");

    const obj = {
      to: email,
      subject: "Welcome Message!",
      text: `Welcome to OneLife, ${fullname}!`,
    };
    mailsender(obj).catch((mailError) => console.error("Welcome email failed:", mailError.message));
    return res.status(200).redirect("/login");
  } catch (error) {
    console.error("Error during patient registration:", error);
    const message = error.code === 11000 ? "An account with this email already exists." : "Unable to create your account. Please try again.";
    res.status(400).render("login", { state: "register", fullname, email, password: "", error: message });
  }
}

async function patientloginfromdb(req, res) {
  const { email, password } = req.body;

  try {
    const token = await User.matchpassword(email, password); 
    res.cookie("token", token, cookieOptions);
    return res.redirect('/');
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.render('login', {
      state: 'login',
      email,
      password: '',
      error: "Incorrect email or password. Please try again."
    });
  }
}

async function PatientProfile(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const decoded = validatetoken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    const patientdata = await User.findById(decoded._id).select("-password");
    res.render('profile',{user:req.user,patientdata});
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error fetching patient data" });
  }
}

async function UpdateProfile(req, res) {
  try {
    const token = req.cookies.token;
    const decoded = validatetoken(token);
    const { fullname, email, number, address, dob, gender } = req.body;
    console.log("Address value:", address);
    let parsedAddress;
    if (address) {
      try {
        parsedAddress = JSON.parse(address);
      } catch (parseError) {
        console.error("Error parsing address:", parseError);
        return res.status(400).json({ success: false, message: "Invalid address format" });
      }
    }
    const updateData = {
      fullname: fullname?.trim(),
      number: number?.trim(),
      address: parsedAddress,
      email: email?.trim().toLowerCase(),
      image: req.file ? `/assets/${req.file.filename}` : undefined,
      dob,
      gender
    };
    console.log("Update data:", updateData);

    const result = await User.findByIdAndUpdate(
      { _id: decoded._id },
      updateData,
      { new: true, runValidators: true }
    );

    // Log the result of the update operation
    console.log("Update result:", result);

    if (!result) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({success:true,message:"Profile updated successfully",token})
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error updating" });
  }
}

async function patientsloginpage(req, res){
  return res.render("login", { state: 'Login', fullname: '', email: '', password: '' });

}
async function patientsregisterpage(req, res){
  return res.render("login", { state: 'register', fullname: '', email: '', password: '' });

}

async function updateAppointmentStatus(req, res) {
  const { appointmentId, status } = req.body;
  const statusUpdates = {
    confirmed: {
      status: "confirmed",
      cancelled: false,
      iscompleted: false,
    },
    completed: {
      status: "completed",
      cancelled: false,
      iscompleted: true,
    },
    cancelled: {
      status: "cancelled",
      cancelled: true,
      iscompleted: false,
      isOnline: false,
    },
  };

  if (!statusUpdates[status]) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const existing = await Appointment.findById(appointmentId);
    if (!existing || (req.user.role === "DOCTOR" && existing.docId !== String(req.user._id))) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      statusUpdates[status],
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    res.json({ success: true, message: `Appointment ${status}` });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ success: false, message: "Error updating appointment status" });
  }
}

async function contactpage(req, res){
  const token=req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  return res.render("contact",{user:req.user,patientdata});

}

// API: Mark an appointment as online request
async function markAppointmentOnline(req, res) {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment || appointment.userid !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    appointment.isOnline = true;
    appointment.status = "online_requested";
    appointment.cancelled = false;
    await appointment.save();

    // Optionally notify doctor or patient
    await sendWhatsAppMessage(`+91${appointment.doctordata.number}`, `You have a new request for an *online* appointment from ${appointment.fullname}.`);
    
    res.json({ success: true, message: "Appointment marked as online" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
}

module.exports = {
  messages,
  PatientProfile,
  patientsloginpage,
  home,
  updateAppointmentStatus,
  patientsregisterpage,
  doctors,
  markAppointmentOnline,
  bookappointment,
  appointmentdetailtable,
  messagesdetailtable,
  sendmsg,
  myappointments,
  savePayments,
  getOnlineAppointmentRequests,
  patientregistrationtodb,
  patientloginfromdb,
  UpdateProfile,
  aboutpage,
  contactpage,
};
