// ===============================
// GLOM STORE - BACKEND (index.js)
// Brevo SMTP + OTP Verify + Auth
// ===============================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// MongoDB
// ===============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB error:", err);
    process.exit(1);
  });

// ===============================
// Mail (BREVO SMTP) ✅
// ===============================
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,           // smtp-relay.brevo.com
  port: Number(process.env.MAIL_PORT),   // 587
  secure: false,
  auth: {
    user: process.env.MAIL_USER,         // apikey
    pass: process.env.MAIL_PASS          // Brevo API Key
  }
});

// ===============================
// User Schema
// ===============================
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  verified: { type: Boolean, default: false },
  verifyCodeHash: String,
  verifyCodeExpires: Date,

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// ===============================
// Helpers
// ===============================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function emailTemplate(code) {
  return `
  <div style="font-family:Segoe UI,Arial;background:#05020a;padding:30px;color:#f4ecff">
    <div style="max-width:420px;margin:auto;background:#12001f;border-radius:16px;padding:24px">
      <h2 style="color:#b66bff;text-align:center">GLOM Store</h2>
      <p style="text-align:center;color:#b9a9d8">Email Verification Code</p>
      <div style="
        margin:24px auto;
        width:fit-content;
        padding:14px 24px;
        font-size:26px;
        letter-spacing:6px;
        background:#1a0033;
        border-radius:12px;
        color:#fff;
      ">
        ${code}
      </div>
      <p style="font-size:13px;color:#b9a9d8;text-align:center">
        Code expires in 10 minutes.<br>
        If you didn’t request this, ignore this email.
      </p>
    </div>
  </div>`;
}

// ===============================
// Register (Send OTP)
// ===============================
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);

    await User.create({
      name,
      email,
      password: hash,
      verified: false,
      verifyCodeHash: codeHash,
      verifyCodeExpires: Date.now() + 10 * 60 * 1000
    });

    await transporter.sendMail({
from: `"GLOM Store" <pixelframe89@gmail.com>` 
      to: email,
      subject: "Verify your email - GLOM Store",
      html: emailTemplate(code)
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// Verify Email (OTP)
// ===============================
app.post("/api/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.verified) {
      return res.json({ success: true });
    }

    if (!user.verifyCodeExpires || user.verifyCodeExpires < Date.now()) {
      return res.status(400).json({ error: "Code expired" });
    }

    const ok = await bcrypt.compare(code, user.verifyCodeHash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid code" });
    }

    user.verified = true;
    user.verifyCodeHash = null;
    user.verifyCodeExpires = null;
    await user.save();

    res.json({ success: true });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// Login (Blocked if not verified)
// ===============================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.verified) {
      return res.status(403).json({ error: "NOT_VERIFIED" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// Frontend fallback
// ===============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
app.listen(PORT, () => {
  console.log("GLOM Store backend running on port", PORT);
});

