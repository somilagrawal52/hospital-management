require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/user");
const app = express();
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Server connected"))
  .catch((err) => console.error("Database connection error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets"))
);
app.use(
  "/user",
  express.static(path.join(__dirname, "..", "frontend", "Admin"))
);

app.use("/", userRoute);

app.get("/", (req, res) => {
  console.log("root route");
  const token = req.cookies.token;
  console.log("Token at root:", token);

  if (!token) {
    console.log("No token found");
    return res.redirect("/login");
  }

  console.log("Token found");
  const filePath = path.join(
    __dirname,
    "..",
    "frontend",
    "Admin",
    "index.html"
  );

  return res.sendFile(filePath);
});

app.listen(PORT, () => console.log(`Server started at port: ${PORT}`));