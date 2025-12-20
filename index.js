require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ===== Mongo ===== */
mongoose.connect(process.env.MONGO_URI);

/* ===== Mail ===== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* ===== User Schema ===== */
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
  verifyCodeHash: String,
  verifyCodeExpires: Date,
});
const User = mongoose.model("User", UserSchema);

/* ===== Helpers ===== */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function emailTemplate(code) {
  return `
  <div style="font-family:Segoe UI;background:#05020a;padding:30px;color:#f4ecff">
    <div style="max-width:420px;margin:auto;background:#12001f;border-radius:16px;padding:24px">
      <h2 style="color:#b66bff;text-align:center">GLOM Store</h2>
      <p style="text-align:center;color:#b9a9d8">Email Verification Code</p>
      <div style="margin:24px auto;width:fit-content;
        padding:14px 24px;font-size:26px;letter-spacing:6px;
        background:#1a0033;border-radius:12px;color:#fff">
        ${code}
      </div>
      <p style="font-size:13px;color:#b9a9d8;text-align:center">
        Code expires in 10 minutes
      </p>
    </div>
  </div>`;
}

/* ===== Register ===== */
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: "Email already exists" });

  const hash = await bcrypt.hash(password, 10);
  const code = generateOTP();
  const codeHash = await bcrypt.hash(code, 10);

  await User.create({
    name,
    email,
    password: hash,
    verified: false,
    verifyCodeHash: codeHash,
    verifyCodeExpires: Date.now() + 10 * 60 * 1000,
  });

  await transporter.sendMail({
    from: `"GLOM Store" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your email",
    html: emailTemplate(code),
  });

  res.json({ success: true });
});

/* ===== Verify ===== */
app.post("/api/verify", async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.verified) return res.json({ success: true });

  if (user.verifyCodeExpires < Date.now())
    return res.status(400).json({ error: "Code expired" });

  const ok = await bcrypt.compare(code, user.verifyCodeHash);
  if (!ok) return res.status(400).json({ error: "Invalid code" });

  user.verified = true;
  user.verifyCodeHash = null;
  user.verifyCodeExpires = null;
  await user.save();

  res.json({ success: true });
});

/* ===== Login ===== */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  if (!user.verified)
    return res.status(403).json({ error: "NOT_VERIFIED" });

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

app.listen(3000, () => console.log("Server running"));
