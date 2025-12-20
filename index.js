// ======================================
// GLOM Store - FULL Production index.js
// ======================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// Middleware
// ======================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

// ======================================
// MongoDB
// ======================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("Mongo Error:", err);
    process.exit(1);
  });

// ======================================
// Schemas
// ======================================
const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const CouponSchema = new mongoose.Schema({
  code: String,
  type: String, // percent | fixed
  value: Number,
  maxUses: Number,
  used: { type: Number, default: 0 },
  expiresAt: Date,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const OrderSchema = new mongoose.Schema({
  orderId: String,
  productId: mongoose.Schema.Types.ObjectId,
  originalAmount: Number,
  finalAmount: Number,
  couponCode: String,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", ProductSchema);
const Coupon = mongoose.model("Coupon", CouponSchema);
const Order = mongoose.model("Order", OrderSchema);

// ======================================
// Helpers
// ======================================
function applyCoupon(amount, coupon) {
  let newAmount = amount;

  if (coupon.type === "percent") {
    newAmount = amount - (amount * coupon.value) / 100;
  } else if (coupon.type === "fixed") {
    newAmount = amount - coupon.value;
  }

  return newAmount < 0 ? 0 : Math.round(newAmount);
}

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_PASSWORD) {
    return res.sendStatus(401);
  }
  next();
}

// ======================================
// Routes
// ======================================

// ---------- Health ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", store: "GLOM Store" });
});

// ---------- Products ----------
app.get("/api/products", async (req, res) => {
  const products = await Product.find({ active: true });
  res.json(products);
});

// ---------- Coupons (Validate) ----------
app.post("/api/coupon/validate", async (req, res) => {
  const { code, price } = req.body;

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    active: true,
  });

  if (!coupon) return res.json({ valid: false });

  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return res.json({ valid: false });

  if (coupon.maxUses && coupon.used >= coupon.maxUses)
    return res.json({ valid: false });

  const finalPrice = applyCoupon(price, coupon);
  res.json({ valid: true, finalPrice });
});

// ---------- Orders ----------
app.post("/api/order", async (req, res) => {
  const { productId, couponCode } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  let finalPrice = product.price;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      active: true,
    });

    if (
      coupon &&
      (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
      (!coupon.maxUses || coupon.used < coupon.maxUses)
    ) {
      finalPrice = applyCoupon(product.price, coupon);
      coupon.used += 1;
      await coupon.save();
      appliedCoupon = coupon.code;
    }
  }

  const order = new Order({
    orderId: crypto.randomUUID(),
    productId,
    originalAmount: product.price,
    finalAmount: finalPrice,
    couponCode: appliedCoupon,
  });

  await order.save();

  res.json({
    success: true,
    order,
  });
});

// ======================================
// ADMIN – Coupons Management
// ======================================

// Get all coupons
app.get("/api/admin/coupons", adminAuth, async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
});

// Create coupon
app.post("/api/admin/coupons", adminAuth, async (req, res) => {
  const coupon = new Coupon({
    code: req.body.code.toUpperCase(),
    type: req.body.type,
    value: req.body.value,
    maxUses: req.body.maxUses || null,
    expiresAt: req.body.expiresAt || null,
  });

  await coupon.save();
  res.json({ success: true });
});

// Toggle coupon
app.post("/api/admin/coupons/:id/toggle", adminAuth, async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.sendStatus(404);

  coupon.active = !coupon.active;
  await coupon.save();

  res.json({ success: true });
});

// Delete coupon
app.delete("/api/admin/coupons/:id", adminAuth, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================================
// Frontend Fallback
// ======================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================
// Start Server
// ======================================
app.listen(PORT, () => {
  console.log(`GLOM Store running on port ${PORT}`);
});
