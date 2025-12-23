import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "./models/User.js";
import Product from "./models/Product.js";
import Plan from "./models/Plan.js";
import Key from "./models/Key.js";
import Order from "./models/Order.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

await mongoose.connect(process.env.MONGO_URI);

const JWT_SECRET = process.env.JWT_SECRET || "glom_secret";

/* ===== AUTH MIDDLEWARE ===== */
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.sendStatus(401);
  try {
    req.user = jwt.verify(h.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.sendStatus(403);
  next();
}

/* ===== AUTH ROUTES ===== */
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "MISSING_FIELDS" });

  if (await User.findOne({ email }))
    return res.status(400).json({ error: "EMAIL_EXISTS" });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
  res.json({ token, name: user.name, email: user.email, role: user.role });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "INVALID" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "INVALID" });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
  res.json({ token, name: user.name, email: user.email, role: user.role });
});

/* ===== ORDERS ===== */
app.post("/api/order", auth, async (req, res) => {
  const { product, plan } = req.body;
  const order = await Order.create({
    user: req.user.id,
    product,
    plan
  });
  res.json(order);
});

app.get("/api/my-orders", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate("product")
    .populate("plan");
  res.json(orders);
});

app.get("/api/admin/orders", auth, adminOnly, async (req, res) => {
  const orders = await Order.find()
    .populate("user")
    .populate("product")
    .populate("plan");
  res.json(orders);
});

/* ===== ORDER APPROVAL ===== */
app.post("/api/admin/order/:id/approve", auth, adminOnly, async (req, res) => {
  const order = await Order.findById(req.params.id);
  const key = await Key.findOne({ plan: order.plan, used: false });
  if (!key) return res.status(400).json({ error: "NO_KEYS" });

  key.used = true;
  await key.save();

  order.status = "approved";
  order.deliveredKey = key.value;
  await order.save();

  res.json({ ok: true, key: key.value });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
