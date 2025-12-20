require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= Mongo =================
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("MongoDB connected"))
  .catch(err=>{console.error(err);process.exit(1);});

// ================= Mail (Brevo) =================
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER, // apikey
    pass: process.env.MAIL_PASS  // Brevo API key
  }
});

// ================= User Schema =================
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
  verifyCodeHash: String,
  verifyCodeExpires: Date,
});
const User = mongoose.model("User", UserSchema);

// ================= Helpers =================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function emailTemplate(code) {
  return `
  <div style="font-family:Segoe UI;background:#05020a;padding:30px;color:#fff">
    <div style="max-width:420px;margin:auto;background:#12001f;padding:24px;border-radius:16px">
      <h2 style="color:#b66bff;text-align:center">GLOM Store</h2>
      <p style="text-align:center;color:#b9a9d8">Your verification code</p>
      <div style="font-size:26px;letter-spacing:6px;
        margin:24px auto;width:fit-content;
        background:#1a0033;padding:14px 24px;border-radius:12px">
        ${code}
      </div>
      <p style="font-size:13px;color:#b9a9d8;text-align:center">
        Code expires in 10 minutes
      </p>
    </div>
  </div>`;
}

// ================= Register =================
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  const exists = await User.findOne({ email });
  if (exists)
    return res.status(400).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const code = generateOTP();

  await User.create({
    name,
    email,
    password: hash,
    verified: false,
    verifyCodeHash: await bcrypt.hash(code, 10),
    verifyCodeExpires: Date.now() + 10 * 60 * 1000
  });

  await transporter.sendMail({
    from: `"GLOM Store" <pixelframe89@gmail.com>`,
    to: email,
    subject: "Verify your email - GLOM Store",
    html: emailTemplate(code)
  });

  res.json({ success: true });
});
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"GLOM Store" <yaghipegusp9@outlook.com>`,
      to: "yaghipegusp9@outlook.com",
      subject: "Brevo Test Email",
      html: "<h2>If you see this, Brevo works ✅</h2>"
    });
    res.send("Email sent");
  } catch (err) {
    console.error("TEST EMAIL ERROR:", err);
    res.status(500).send("Failed");
  }
});


// ================= Resend OTP (NEW) =================
app.post("/api/resend-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.verified)
    return res.json({ success: true, message: "Already verified" });

  const code = generateOTP();
  user.verifyCodeHash = await bcrypt.hash(code, 10);
  user.verifyCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await transporter.sendMail({
    from: `"GLOM Store" <yaghipegusp9@outlook.com>`,
    to: email,
    subject: "Your new verification code - GLOM Store",
    html: emailTemplate(code)
  });

  res.json({ success: true });
});

// ================= Verify =================
app.post("/api/verify", async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.verifyCodeExpires || user.verifyCodeExpires < Date.now())
    return res.status(400).json({ error: "Code expired" });

  const ok = await bcrypt.compare(code, user.verifyCodeHash);
  if (!ok) return res.status(400).json({ error: "Invalid code" });

  user.verified = true;
  user.verifyCodeHash = null;
  user.verifyCodeExpires = null;
  await user.save();

  res.json({ success: true });
});

// ================= Login =================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  if (!user.verified)
    return res.status(403).json({ error: "NOT_VERIFIED" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.listen(PORT, ()=>console.log("Server running on", PORT));

