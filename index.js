import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import crypto from "crypto";
import Tesseract from "tesseract.js";

dotenv.config();
const app = express();

/* ================= BASIC ================= */
app.use(express.json());
app.use(express.static("public"));

/* ================= DATABASE ================= */
await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");

/* ================= UPLOAD ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));

/* ================= MODELS ================= */
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
    price: Number
  }],
  referenceCode: String,
  status: String, // waiting_payment | waiting_admin | delivered | rejected | out_of_stock
  payment: {
    proofUrl: String,
    detectedAmount: Number,
    expectedAmount: Number,
    flag: String
  },
  delivery: String,
  createdAt: { type: Date, default: Date.now }
}));

/* ================= HELPERS ================= */
function genReference() {
  return "GLOM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

const USD_TO_SAR = 3.75;

async function extractAmountsFromImage(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, "eng+ara");
  const text = data.text
    .replace(/[,،]/g, ".")
    .replace(/[^\d.\n ]/g, " ");

  const matches = text.match(/\d+(\.\d{1,2})?/g);
  if (!matches) return [];
  return matches.map(n => parseFloat(n)).filter(n => n >= 0.5 && n < 100000);
}

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
  res.json(await Product.find({ active: true }));
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

  res.json({ orderId: order._id, referenceCode });
});

/* ================= ORDER STATUS ================= */
app.get("/api/store/order/:id", async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: "ORDER_NOT_FOUND" });
  res.json(o);
});

/* ================= PROOF UPLOAD + VERIFY ================= */
app.post(
  "/api/store/order/:id/proof-upload",
  upload.single("proof"),
  async (req, res) => {

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND" });

    const reference = req.body.reference?.trim();
    if (reference !== order.referenceCode) {
      order.status = "rejected";
      await order.save();
      return res.json({ flag: "invalid_reference" });
    }

    const imagePath = `uploads/${req.file.filename}`;
    const extracted = await extractAmountsFromImage(imagePath);

    const product = await Product.findById(order.items[0].productId);
    const plan = product.plans.find(p => p.name === order.items[0].plan);

    const check = verifyAmount(extracted, plan.price);

    order.payment = {
      proofUrl: `/uploads/${req.file.filename}`,
      detectedAmount: check.detected ?? null,
      expectedAmount: check.requiredSAR,
      flag: check.reason || "clear"
    };

    if (check.status !== "clear") {
      order.status = "waiting_admin";
      await order.save();
      return res.json({ flag: "admin_review" });
    }

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

    res.json({ flag: "clear", delivered: true, key });
  }
);

/* ================= ADMIN ================= */

// Add product
app.post("/api/admin/products", upload.single("image"), async (req, res) => {
  const { title, description, categorySlug, priceUSD } = req.body;
  if (!title || !priceUSD || !req.file)
    return res.status(400).json({ error: "MISSING_FIELDS" });

  const product = await Product.create({
    title,
    description,
    categorySlug: categorySlug || "",
    active: true,
    images: [`/uploads/${req.file.filename}`],
    plans: []
  });

  res.json({ success: true, product });
});

// List products
app.get("/api/admin/products", async (req, res) => {
  res.json(await Product.find());
});

// Delete product
app.delete("/api/admin/product/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Add plan
app.post("/api/admin/product/:id/plan", async (req, res) => {
  const { name, price } = req.body;
  const product = await Product.findById(req.params.id);
  product.plans.push({ name, price: Number(price), keys: [] });
  await product.save();
  res.json({ success: true });
});

// Add key
app.post("/api/admin/product/:pid/plan/:pname/key", async (req, res) => {
  const { key } = req.body;
  const product = await Product.findById(req.params.pid);
  const plan = product.plans.find(p => p.name === req.params.pname);
  plan.keys.push(key);
  await product.save();
  res.json({ success: true });
});

// Review orders
app.get("/api/admin/review-orders", async (req, res) => {
  res.json(await Order.find({ status: "waiting_admin" }));
});

// Approve
app.post("/api/admin/order/:id/approve", async (req, res) => {
  const order = await Order.findById(req.params.id);
  const product = await Product.findById(order.items[0].productId);
  const plan = product.plans.find(p => p.name === order.items[0].plan);

  const key = plan.keys.shift();
  await product.save();

  order.delivery = key;
  order.status = "delivered";
  await order.save();

  res.json({ success: true });
});

// Reject
app.post("/api/admin/order/:id/reject", async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = "rejected";
  await order.save();
  res.json({ success: true });
});

// Stats
app.get("/api/admin/orders-stats", async (req, res) => {
  res.json({
    suspicious: await Order.countDocuments({ status: "waiting_admin" }),
    approved: await Order.countDocuments({ status: "delivered" }),
    rejected: await Order.countDocuments({ status: "rejected" })
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
