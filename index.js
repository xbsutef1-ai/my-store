import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===================== ENV ===================== */
const MONGO_URI = process.env.MONGO_URI;
const APP_SECRET = process.env.APP_SECRET || "CHANGE_ME_SECRET";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Sender لازم يكون “مضاف ومؤكد” داخل Brevo Senders
const MAIL_SENDER = process.env.MAIL_SENDER || "yaghipegusp9@outlook.com";
const STORE_NAME = "GLOM Store";

// معلومات التحويل (اختياري)
const BANK_NAME = process.env.BANK_NAME || "Bank";
const BANK_IBAN = process.env.BANK_IBAN || "SA00 0000 0000 0000 0000 0000";
const BANK_ACC = process.env.BANK_ACC || "0000000000";

/* ===================== DB ===================== */
if (!MONGO_URI) {
  console.error("Missing MONGO_URI");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => {
    console.error("MongoDB error:", e);
    process.exit(1);
  });

/* ===================== SCHEMAS ===================== */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true },
    name: String,
    passHash: String,
    verified: { type: Boolean, default: false },
    code: String,
    codeExpires: Date
  },
  { timestamps: true }
);

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true, index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    images: [String],
    categorySlug: String,
    active: { type: Boolean, default: true },
    plans: [
      {
        name: String,
        price: Number,
        keys: [String]
      }
    ]
  },
  { timestamps: true }
);

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    type: { type: String, enum: ["percent", "amount"], default: "percent" },
    value: Number, // percent 1-100 OR amount
    expiresAt: Date,
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const OrderSchema = new mongoose.Schema(
  {
    userEmail: String,
    userName: String,
    productId: String,
    productTitle: String,
    planName: String,
    price: Number,
    discount: Number,
    finalTotal: Number,
    couponCode: String,
    status: {
      type: String,
      enum: ["awaiting_payment", "waiting_review", "delivered", "rejected"],
      default: "awaiting_payment"
    },
    payment: {
      reference: String,
      proofUrl: String,
      flag: { type: String, enum: ["clear", "suspicious", "fraud"], default: "clear" },
      proofHash: String
    },
    delivery: {
      key: String
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
const Category = mongoose.model("Category", CategorySchema);
const Product = mongoose.model("Product", ProductSchema);
const Coupon = mongoose.model("Coupon", CouponSchema);
const Order = mongoose.model("Order", OrderSchema);

/* ===================== UTILS ===================== */
function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function hmac(s) {
  return crypto.createHmac("sha256", APP_SECRET).update(s).digest("hex");
}
function nowMs() {
  return Date.now();
}

function makeToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (hmac(payload) !== sig) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (obj.exp && obj.exp < nowMs()) return null;
    return obj;
  } catch {
    return null;
  }
}

function requireUser(req, res, next) {
  const t = req.headers.authorization?.replace("Bearer ", "") || "";
  const p = verifyToken(t);
  if (!p?.email) return res.status(401).json({ error: "UNAUTHORIZED" });
  req.user = p;
  next();
}

function requireAdmin(req, res, next) {
  const t = req.headers["x-admin-token"] || "";
  const p = verifyToken(t);
  if (!p?.admin) return res.status(401).json({ error: "ADMIN_UNAUTHORIZED" });
  next();
}

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF\-]/g, "");
}

async function sendVerifyEmail(to, code) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: STORE_NAME, email: MAIL_SENDER },
      to: [{ email: to }],
      subject: `رمز التحقق - ${STORE_NAME}`,
      htmlContent: `
        <div style="font-family:Arial;background:#0b0014;color:#fff;padding:28px;border-radius:14px">
          <h2 style="margin:0;color:#b66bff">${STORE_NAME}</h2>
          <p style="opacity:.9;margin-top:10px">رمز التحقق الخاص بك:</p>
          <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#b66bff;margin:14px 0">${code}</div>
          <p style="opacity:.75;font-size:13px">الرمز صالح لمدة 10 دقائق.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("BREVO ERROR:", t);
    throw new Error("EMAIL_FAILED");
  }
}

/* ===================== PAGES ROUTES ===================== */
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/account", (req, res) => res.sendFile(path.join(__dirname, "public", "account.html")));

/* ===================== AUTH (USER) ===================== */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: "MISSING_FIELDS" });

    const code = genCode();
    const passHash = sha256(`${password}:${email.toLowerCase()}`);

    await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        email: email.toLowerCase(),
        name,
        passHash,
        verified: false,
        code,
        codeExpires: new Date(nowMs() + 10 * 60 * 1000)
      },
      { upsert: true }
    );

    await sendVerifyEmail(email.toLowerCase(), code);
    res.json({ success: true });
  } catch (e) {
    console.error("REGISTER ERR:", e);
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

app.post("/api/auth/resend", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "MISSING_EMAIL" });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u) return res.status(404).json({ error: "NOT_FOUND" });

    const code = genCode();
    u.code = code;
    u.codeExpires = new Date(nowMs() + 10 * 60 * 1000);
    u.verified = false;
    await u.save();

    await sendVerifyEmail(u.email, code);
    res.json({ success: true });
  } catch (e) {
    console.error("RESEND ERR:", e);
    res.status(500).json({ error: "RESEND_FAILED" });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: "MISSING_FIELDS" });

  const u = await User.findOne({ email: email.toLowerCase() });
  if (!u) return res.status(404).json({ error: "NOT_FOUND" });

  if (!u.code || u.code !== code) return res.status(400).json({ error: "INVALID_CODE" });
  if (!u.codeExpires || u.codeExpires.getTime() < nowMs()) return res.status(400).json({ error: "CODE_EXPIRED" });

  u.verified = true;
  u.code = null;
  await u.save();

  // اصدار توكن
  const token = makeToken({ email: u.email, name: u.name, exp: nowMs() + 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token, name: u.name, email: u.email });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "MISSING_FIELDS" });

  const u = await User.findOne({ email: email.toLowerCase() });
  if (!u) return res.status(400).json({ error: "WRONG_CREDENTIALS" });
  if (!u.verified) return res.status(403).json({ error: "NOT_VERIFIED" });

  const passHash = sha256(`${password}:${email.toLowerCase()}`);
  if (passHash !== u.passHash) return res.status(400).json({ error: "WRONG_CREDENTIALS" });

  const token = makeToken({ email: u.email, name: u.name, exp: nowMs() + 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token, name: u.name, email: u.email });
});

/* ===================== STORE (PUBLIC) ===================== */
app.get("/api/store/categories", async (req, res) => {
  const cats = await Category.find().sort({ order: 1, createdAt: 1 });
  res.json(cats);
});

app.get("/api/store/products", async (req, res) => {
  const { category } = req.query;
  const q = { active: true };
  if (category && category !== "all") q.categorySlug = String(category);
  const products = await Product.find(q).sort({ createdAt: -1 });
  // لا نرجع المفاتيح
  const safe = products.map((p) => ({
    _id: p._id,
    title: p.title,
    description: p.description,
    images: p.images || [],
    categorySlug: p.categorySlug || "",
    active: p.active,
    plans: (p.plans || []).map((pl) => ({
      name: pl.name,
      price: pl.price,
      stock: (pl.keys || []).length
    }))
  }));
  res.json(safe);
});

app.get("/api/store/bank", (req, res) => {
  res.json({ bankName: BANK_NAME, iban: BANK_IBAN, account: BANK_ACC });
});

app.get("/api/store/coupon/:code", async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const c = await Coupon.findOne({ code, active: true });
  if (!c) return res.status(404).json({ error: "NOT_FOUND" });
  if (c.expiresAt && c.expiresAt.getTime() < nowMs()) return res.status(400).json({ error: "EXPIRED" });
  res.json({ code: c.code, type: c.type, value: c.value, expiresAt: c.expiresAt });
});

app.post("/api/store/order", requireUser, async (req, res) => {
  const { productId, planName, couponCode } = req.body || {};
  if (!productId || !planName) return res.status(400).json({ error: "MISSING_FIELDS" });

  const p = await Product.findById(productId);
  if (!p || !p.active) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });

  const plan = (p.plans || []).find((x) => x.name === planName);
  if (!plan) return res.status(404).json({ error: "PLAN_NOT_FOUND" });

  const stock = (plan.keys || []).length;
  if (stock <= 0) return res.status(400).json({ error: "OUT_OF_STOCK" });

  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    const c = await Coupon.findOne({ code, active: true });
    if (c && (!c.expiresAt || c.expiresAt.getTime() >= nowMs())) {
      appliedCoupon = c.code;
      if (c.type === "percent") discount = Math.round((plan.price * (c.value / 100)) * 100) / 100;
      if (c.type === "amount") discount = Math.min(plan.price, c.value);
    }
  }

  const finalTotal = Math.max(0, plan.price - discount);

  const o = await Order.create({
    userEmail: req.user.email,
    userName: req.user.name,
    productId: String(p._id),
    productTitle: p.title,
    planName,
    price: plan.price,
    discount,
    finalTotal,
    couponCode: appliedCoupon,
    status: "awaiting_payment"
  });

  res.json({ success: true, orderId: o._id, finalTotal });
});

app.post("/api/store/order/:id/proof", requireUser, async (req, res) => {
  const { reference, proofUrl } = req.body || {};
  if (!reference || !proofUrl) return res.status(400).json({ error: "MISSING_FIELDS" });

  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
  if (o.userEmail !== req.user.email) return res.status(403).json({ error: "FORBIDDEN" });

  const proofHash = sha256(String(proofUrl).trim());
  // duplicate check
  const dup = await Order.findOne({ "payment.proofHash": proofHash });
  let flag = "clear";
  if (dup && String(dup._id) !== String(o._id)) flag = "fraud";
  else if (String(reference).trim().length < 6) flag = "suspicious";

  o.payment = { reference: String(reference).trim(), proofUrl: String(proofUrl).trim(), flag, proofHash };
  o.status = "waiting_review";
  await o.save();

  res.json({ success: true, flag });
});

app.get("/api/store/my/orders", requireUser, async (req, res) => {
  const orders = await Order.find({ userEmail: req.user.email }).sort({ createdAt: -1 });
  res.json(orders);
});

/* ===================== ADMIN ===================== */
app.post("/api/admin/login", async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "MISSING_PASSWORD" });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "WRONG_PASSWORD" });
  const token = makeToken({ admin: true, exp: nowMs() + 24 * 60 * 60 * 1000 });
  res.json({ success: true, token });
});

app.get("/api/admin/overview", requireAdmin, async (req, res) => {
  const orders = await Order.countDocuments();
  const pending = await Order.countDocuments({ status: "waiting_review" });
  const awaiting = await Order.countDocuments({ status: "awaiting_payment" });
  const delivered = await Order.countDocuments({ status: "delivered" });

  const revAgg = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: null, revenue: { $sum: "$finalTotal" } } }
  ]);
  const revenue = revAgg?.[0]?.revenue || 0;

  res.json({ orders, pending, awaiting, delivered, revenue });
});

/* Categories CRUD */
app.get("/api/admin/categories", requireAdmin, async (req, res) => {
  res.json(await Category.find().sort({ order: 1, createdAt: 1 }));
});

app.post("/api/admin/categories", requireAdmin, async (req, res) => {
  const { name, slug, order } = req.body || {};
  if (!name) return res.status(400).json({ error: "MISSING_NAME" });

  const s = normalizeSlug(slug || name);
  const c = await Category.create({ name, slug: s, order: Number(order || 0) });
  res.json(c);
});

app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* Products CRUD + plans/keys */
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  res.json(await Product.find().sort({ createdAt: -1 }));
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { title, description, images, categorySlug, active, plans } = req.body || {};
  if (!title) return res.status(400).json({ error: "MISSING_TITLE" });

  const p = await Product.create({
    title,
    description: description || "",
    images: Array.isArray(images) ? images.filter(Boolean) : [],
    categorySlug: categorySlug || "",
    active: active !== false,
    plans: Array.isArray(plans) ? plans.map((pl) => ({
      name: String(pl.name || "").trim(),
      price: Number(pl.price || 0),
      keys: Array.isArray(pl.keys) ? pl.keys.filter(Boolean) : []
    })).filter((pl) => pl.name) : []
  });

  res.json(p);
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const { title, description, images, categorySlug, active, plans } = req.body || {};

  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: "NOT_FOUND" });

  p.title = title ?? p.title;
  p.description = description ?? p.description;
  p.images = Array.isArray(images) ? images.filter(Boolean) : p.images;
  p.categorySlug = categorySlug ?? p.categorySlug;
  p.active = typeof active === "boolean" ? active : p.active;

  if (Array.isArray(plans)) {
    p.plans = plans.map((pl) => ({
      name: String(pl.name || "").trim(),
      price: Number(pl.price || 0),
      keys: Array.isArray(pl.keys) ? pl.keys.filter(Boolean) : []
    })).filter((pl) => pl.name);
  }

  await p.save();
  res.json(p);
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* Coupons CRUD */
app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
  res.json(await Coupon.find().sort({ createdAt: -1 }));
});

app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
  const { code, type, value, expiresAt, active } = req.body || {};
  if (!code) return res.status(400).json({ error: "MISSING_CODE" });

  const c = await Coupon.create({
    code: String(code).trim().toUpperCase(),
    type: type === "amount" ? "amount" : "percent",
    value: Number(value || 0),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: active !== false
  });

  res.json(c);
});

app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* Orders */
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const { status } = req.query;
  const q = {};
  if (status) q.status = status;
  res.json(await Order.find(q).sort({ createdAt: -1 }));
});

app.post("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: "NOT_FOUND" });
  if (!["awaiting_payment", "waiting_review", "delivered", "rejected"].includes(status))
    return res.status(400).json({ error: "BAD_STATUS" });

  o.status = status;
  await o.save();
  res.json({ success: true });
});

app.post("/api/admin/orders/:id/deliver", requireAdmin, async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: "NOT_FOUND" });
  if (o.status !== "waiting_review") return res.status(400).json({ error: "NOT_READY" });

  const p = await Product.findById(o.productId);
  if (!p) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });

  const plan = (p.plans || []).find((x) => x.name === o.planName);
  if (!plan) return res.status(404).json({ error: "PLAN_NOT_FOUND" });

  if (!plan.keys || plan.keys.length === 0) return res.status(400).json({ error: "OUT_OF_STOCK" });

  const key = plan.keys.shift(); // يسحب أول مفتاح
  await p.save();

  o.delivery = { key };
  o.status = "delivered";
  await o.save();

  res.json({ success: true, key });
});

/* ===================== START ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on port", PORT));
