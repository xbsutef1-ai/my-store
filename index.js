import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB error:", err);
    process.exit(1);
  });

/* ================= MODELS ================= */
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    verified: { type: Boolean, default: false },
    code: String,
    codeExpires: Date
  })
);

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================= BREVO SEND ================= */
async function sendVerifyEmail(to, code) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: "GLOM Store",
        email: "yaghipegusp9@outlook.com" // لازم يكون مضاف ومؤكّد في Brevo
      },
      to: [{ email: to }],
      subject: "رمز التحقق - GLOM Store",
      htmlContent: `
        <div style="font-family:Arial;background:#0b0014;color:#fff;padding:30px">
          <h2 style="color:#b66bff">GLOM Store</h2>
          <p>رمز التحقق الخاص بك:</p>
          <div style="
            font-size:32px;
            letter-spacing:6px;
            margin:20px 0;
            font-weight:bold;
            color:#b66bff
          ">
            ${code}
          </div>
          <p>الرمز صالح لمدة 10 دقائق.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("BREVO ERROR:", text);
    throw new Error("EMAIL_FAILED");
  }
}

/* ================= AUTH ================= */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const code = genCode();

    await User.findOneAndUpdate(
      { email },
      {
        email,
        password,
        verified: false,
        code,
        codeExpires: Date.now() + 10 * 60 * 1000
      },
      { upsert: true }
    );

    await sendVerifyEmail(email, code);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "EMAIL_SEND_FAILED" });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const { email, code } = req.body;
  const u = await User.findOne({ email });

  if (!u || u.code !== code || u.codeExpires < Date.now()) {
    return res.status(400).json({ error: "INVALID_CODE" });
  }

  u.verified = true;
  u.code = null;
  await u.save();

  res.json({ success: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email, password });

  if (!u) return res.status(400).json({ error: "WRONG_CREDENTIALS" });
  if (!u.verified) return res.status(403).json({ error: "NOT_VERIFIED" });

  res.json({ success: true });
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
