import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ================= MIDDLEWARE ================= */
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

const Category = mongoose.model(
  "Category",
  new mongoose.Schema({
    name: String,
    slug: String,
    order: Number
  })
);

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    title: String,
    description: String,
    images: [String],
    category: String,
    plans: [
      {
        name: String,
        price: Number,
        keys: [String]
      }
    ],
    active: { type: Boolean, default: true }
  })
);

const Order = mongoose.model(
  "Order",
  new mongoose.Schema({
    userEmail: String,
    items: [
      {
        productId: String,
        title: String,
        plan: String,
        price: Number
      }
    ],
    finalTotal: Number,
    status: String,
    payment: {
      ref: String,
      proofUrl: String,
      flag: String
    },
    delivery: String,
    createdAt: { type: Date, default: Date.now }
  })
);

const ProofHash = mongoose.model(
  "ProofHash",
  new mongoose.Schema({
    hash: String,
    orderId: String,
    createdAt: { type: Date, default: Date.now }
  })
);

/* ================= HELPERS ================= */
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function md5(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

async function sendVerifyEmail(to, code) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        email: process.env.MAIL_FROM || "no-reply@glomstore.com",
        name: "GLOM Store"
      },
      to: [{ email: to }],
      subject: "رمز التحقق - GLOM Store",
      htmlContent: `
        <div style="font-family:Arial;background:#0b0014;color:#fff;padding:30px">
          <h2 style="color:#b66bff">GLOM Store</h2>
          <p>رمز التحقق الخاص بك:</p>
          <div style="font-size:32px;letter-spacing:6px;font-weight:bold;color:#b66bff">
            ${code}
          </div>
          <p>الرمز صالح لمدة 10 دقائق.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("BREVO ERROR:", t);
    throw new Error("Email failed");
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
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const { email, code } = req.body;
  const u = await User.findOne({ email });

  if (!u || u.code !== code || u.codeExpires < Date.now())
    return res.status(400).json({ error: "INVALID_CODE" });

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

/* ================= STORE ================= */
app.get("/api/store/categories", async (req, res) => {
  res.json(await Category.find().sort({ order: 1 }));
});

app.get("/api/store/products", async (req, res) => {
  const q = { active: true };
  if (req.query.category) q.category = req.query.category;
  res.json(await Product.find(q));
});

app.post("/api/store/order", async (req, res) => {
  const o = await Order.create({
    userEmail: req.body.email,
    items: [req.body.product],
    finalTotal: req.body.price,
    status: "pending"
  });

  res.json({ orderId: o._id });
});

app.post("/api/store/order/:id/payment", async (req, res) => {
  const o = await Order.findById(req.params.id);

  const h = md5(req.body.proofUrl);
  const dup = await ProofHash.findOne({ hash: h });

  let flag = "clear";
  if (dup) flag = "fraud";
  else if (!req.body.reference || req.body.reference.length < 6)
    flag = "suspicious";

  await ProofHash.create({ hash: h, orderId: o._id });

  o.payment = {
    ref: req.body.reference,
    proofUrl: req.body.proofUrl,
    flag
  };
  o.status = "waiting_review";
  await o.save();

  res.json({ flag });
});

app.get("/api/store/my-orders", async (req, res) => {
  res.json(
    await Order.find({ userEmail: req.query.email }).sort({ createdAt: -1 })
  );
});

/* ================= SERVER ================= */
/*
  ❗ لا نحدد بورت ثابت
  Render يمرر PORT تلقائي
*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
