import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import multer from "multer";
import Tesseract from "tesseract.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.static("public"));

/* ================= DATABASE ================= */
await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");

/* ================= UPLOAD ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

/* ================= MODELS ================= */
const User = mongoose.model("User", new mongoose.Schema({
  email: String,
  password: String,
  verified: Boolean,
  role: { type: String, default: "user" } // user | support | admin
}));

const Product = mongoose.model("Product", new mongoose.Schema({
  title: String,
  description: String,
  images: [String],
  categorySlug: String,
  active: Boolean,
  plans: [{
    name: String,
    price: Number, // USD
    keys: [String]
  }]
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  userEmail: String,
  items: [{
    productId: String,
    title: String,
    plan: String,
    price: Number // USD
  }],
  referenceCode: String,
  status: String, // waiting_payment | waiting_admin | delivered | rejected | out_of_stock
  payment: {
    ref: String,
    proofUrl: String,
    detectedAmount: Number,
    expectedAmount: Number,
    flag: String
  },
  delivery: String,
  createdAt: { type: Date, default: Date.now }
}));

const ProofHash = mongoose.model("ProofHash", new mongoose.Schema({
  hash: String,
  orderId: String
}));

/* ================= HELPERS ================= */
function genReference() {
  return "GLOM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

function md5(buf) {
  return crypto.createHash("md5").update(buf).digest("hex");
}

/* ================= EMAIL (BREVO) ================= */
async function sendMail(to, subject, html) {
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "GLOM Store", email: "yaghipegusp9@outlook.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
}

/* ================= OCR ================= */
async function extractAmountsFromImage(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, "eng+ara");
  const text = data.text
    .replace(/[,،]/g, ".")
    .replace(/[^\d.\n ]/g, " ");

  const matches = text.match(/\d+(\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(n => parseFloat(n)).filter(n => n >= 0.5 && n < 100000);
}

const USD_TO_SAR = 3.75;
function verifyAmount(extracted, priceUSD) {
  const requiredSAR = +(priceUSD * USD_TO_SAR).toFixed(2);
  if (!extracted.length) {
    return { status: "admin_review", reason: "amount_not_detected", requiredSAR };
  }
  const detected = Math.max(...extracted);
  if (detected < requiredSAR) {
    return { status: "admin_review", reason: "amount_less", requiredSAR, detected };
  }
  return { status: "clear", requiredSAR, detected };
}

/* ================= STORE ================= */
app.get("/api/store/products", async (req, res) => {
  const q = { active: true };
  if (req.query.category) q.categorySlug = req.query.category;
  res.json(await Product.find(q));
});

app.get("/api/store/product/:id", async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p || !p.active) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(p);
});

/* ================= CREATE ORDER ================= */
app.post("/api/store/order", async (req, res) => {
  const { email, productId, planName } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });

  const plan = product.plans.find(p => p.name === planName);
  if (!plan) return res.status(400).json({ error: "PLAN_NOT_FOUND" });

  const referenceCode = genReference();

  const order = await Order.create({
    userEmail: email,
    items: [{
      productId,
      title: product.title,
      plan: plan.name,
      price: plan.price
    }],
    referenceCode,
    status: "waiting_payment"
  });

  await sendMail(
    email,
    "تم إنشاء طلبك - GLOM Store",
    `<p>رمز التحويل الخاص بك:</p><h2>${referenceCode}</h2>
     <p>⚠️ اكتب هذا الرمز في وصف/سبب التحويل البنكي</p>`
  );

  res.json({ orderId: order._id, referenceCode });
});

/* ================= ORDER STATUS ================= */
app.get("/api/store/order/:id", async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
  res.json(o);
});

/* ================= PROOF UPLOAD + STRONG VERIFY ================= */
app.post(
  "/api/store/order/:id/proof-upload",
  upload.single("proof"),
  async (req, res) => {

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    if (order.status === "delivered")
      return res.status(400).json({ error: "ALREADY_DELIVERED" });

    const reference = req.body.reference?.trim();
    if (reference !== order.referenceCode) {
      order.status = "rejected";
      order.payment = { flag: "invalid_reference" };
      await order.save();
      return res.json({ flag: "invalid_reference" });
    }

    // duplicate image check
    const fileHash = md5(req.file.filename);
    const dup = await ProofHash.findOne({ hash: fileHash });
    if (dup) {
      order.status = "waiting_admin";
      order.payment = { flag: "duplicate_proof" };
      await order.save();
      return res.json({ flag: "duplicate_proof" });
    }
    await ProofHash.create({ hash: fileHash, orderId: order._id });

    const imagePath = `uploads/${req.file.filename}`;
    const extracted = await extractAmountsFromImage(imagePath);

    const product = await Product.findById(order.items[0].productId);
    const plan = product.plans.find(p => p.name === order.items[0].plan);

    const check = verifyAmount(extracted, plan.price);

    order.payment = {
      ref: reference,
      proofUrl: `/uploads/${req.file.filename}`,
      detectedAmount: check.detected ?? null,
      expectedAmount: check.requiredSAR,
      flag: check.reason || "clear"
    };

    if (check.status !== "clear") {
      order.status = "waiting_admin";
      await order.save();
      await sendMail(
        order.userEmail,
        "طلبك قيد المراجعة",
        `<p>تم استلام إثبات الدفع.</p>
         <p>المطلوب: ${check.requiredSAR} ريال</p>
         <p>المكتشف: ${check.detected ?? "غير واضح"} ريال</p>`
      );
      return res.json({ flag: "admin_review" });
    }

    // deliver
    if (!plan.keys.length) {
      order.status = "out_of_stock";
      await order.save();
      return res.json({ flag: "out_of_stock" });
    }

    const key = plan.keys.shift();
    await product.save();

    order.delivery = key;
    order.status = "delivered";
    await order.save();

    await sendMail(
      order.userEmail,
      "تم تسليم طلبك ✔️",
      `<p>المفتاح:</p><h3>${key}</h3>`
    );

    res.json({ flag: "clear", delivered: true });
  }
);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on", PORT));
