require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/user");
const { checkforauthentication, restrictTo } = require("./middlewares/auth");
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets"))
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "doctor", "assets"))
);
app.use(
  "/user",
  express.static(path.join(__dirname, "..", "frontend", "Admin"))
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "patient", "assets"))
);
app.use(
  "/user",
  express.static(path.join(__dirname, "..", "frontend", "patient"))
);

app.use("/", userRoute);

app.get("/health", (req, res) => {
  res.json({ msg: "success" });
});

app.get(
  "/admin",
  checkforauthentication("token"),
  restrictTo(["ADMIN"]),
  (req, res) => {
    console.log("root route");
    const filePath = path.join(
      __dirname,
      "..",
      "frontend",
      "Admin",
      "index.html"
    );
    return res.sendFile(filePath);
  }
);

app.get("/clear/:id",async(req,res)=> {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/doctors-detail")
  } catch (error) {
    console.error(error);
    res.status(500).send("server error")
  }
})

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: err.message });
});
app.listen(PORT, () => console.log(`Server started at port: ${PORT}`));
