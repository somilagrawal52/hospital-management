const PDFDocument = require('pdfkit');
const fs = require('fs');
const Appointment = require("../models/appointment");
const Message = require("../models/messages");
const { mailsender,sendWhatsAppMessage } = require("./mail");
const User = require("../models/user");
// const otpgeneration = require("otp-generator");
const Razorpay = require("razorpay");
const { validatetoken } = require("../services/auth");



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
    }).sort({ date: -1 });

    res.json({ success: true, appointments: onlineAppointments });
  } catch (error) {
    console.error("Error fetching online appointments:", error);
    res.status(500).json({ success: false, message: "Error fetching online appointments" });
  }
}

async function bookappointment(req, res) {
  try {
    const token = req.cookies.token;
    const decoded = validatetoken(token);
    const { docId, fullname, email, number, date, line1, line2, amount } = req.body;
    const userid = decoded._id;
    
    const razorpayOrder = await instance.orders.create({
      amount: amount * 100,
      currency: "INR",
    });
    
    const invoiceDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    const fileName = `invoice-${Date.now()}.pdf`;
    const filePath = path.join(invoiceDir, fileName);
    const doc = new PDFDocument();
    const doctordata = await User.findById(docId).select("-password");

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('Payment Successful! Thank you for using OneLife.');
    doc.text(`Invoice ID: ${razorpayOrder.id}`);
    doc.text(`Patient Name: ${fullname}`);
    doc.text(`Doctor Name: Dr. ${doctordata.fullname}`); 
    doc.text(`Date of Appointment: ${date}`);
    doc.text(`Amount Paid: ${amount}`);
    doc.end();

    if(!doctordata.available){
      return res.status(400).json({success:false,message:"Doctor is not available"});
    }

    await doctordata.save();
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
      date: new Date(date),
      amount: doctordata.fees,
      userdata,
      doctordata,
      status: "pending",
    });

    console.log("Attempting to save appointment:", appointment);
    await appointment.save();
    console.log("Appointment saved successfully");

    const patientmail = {
      to: email,
      subject: "Appointment Booked",
      text: `${fullname} your Appointment is booked`,
      attachments: [
        {
          path: filePath,
          contentType: 'application/pdf',
        }
      ],
    };
    const doctormail = {
      to: doctordata.email,
      subject: "Appointment Booked",
      text: `${doctordata.fullname} you have been booked for ${date} by ${fullname}`,
      attachments: [
        {
          path: filePath,
          contentType: 'application/pdf',
        }
      ],
    };
    await mailsender(patientmail,filePath);
    await mailsender(doctormail,filePath);

    await sendWhatsAppMessage(`+91${doctordata.number}`, `Dr. ${doctordata.fullname}, an appointment has been scheduled for ${date} with patient ${fullname}.`);
    await sendWhatsAppMessage(`+91${number}`, `${fullname}, your appointment is confirmed for ${date} with Dr. ${doctordata.fullname}.`);

    res.json({
      message: "Appointment created successfully.",
      appointmentId: appointment._id,
      razorpayOrderId: razorpayOrder.id,
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
    const{userid}=req.body;
    const appointments = await Appointment.find({userid});
    console.log(appointments)
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
      fullname,
      question,
      msgbody,
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
      appointment.formattedDate = formatAppointmentDate(appointment.date);
      return appointment;
    });
    console.log("Patient appointments data:", patientdata.appointments);

    res.render('myAppointment',{user:req.user,patientdata});
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error fetching patient data" });
  }
}

async function savePayments(req, res) {
  const { appointmentId, paymentId } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    appointment.payment.paymentId = paymentId;
    appointment.payment.status = "success";

    await appointment.save();

    res.json({ message: "Payment saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving payment." });
  }
}

async function patientregistrationtodb(req, res) {
  const { fullname, email, password } = req.body;

  try {
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
    await mailsender(obj);
    return res.status(200).redirect("/login");
  } catch (error) {
    console.error("Error during patient registration:", error);
    res.status(500).send("Server error");
  }
}

async function patientloginfromdb(req, res) {
  const { email, password } = req.body;

  try {
    const token = await User.matchpassword(email, password); 
    res.cookie("token", token );
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
      fullname,
      number,
      address: parsedAddress,
      email,
      image: req.file ? `/assets/${req.file.filename}` : undefined,
      dob,
      gender
    };
    console.log("Update data:", updateData);

    const result = await User.findByIdAndUpdate(
      { _id: decoded._id },
      updateData,
      { new: true } 
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
    if (!appointment) {
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
