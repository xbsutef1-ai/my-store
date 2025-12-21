require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"));

/* ================= MODELS ================= */

const Product = mongoose.model("Product", new mongoose.Schema({
  title: String,
  description: String,
  images: [String],
  category: String,
  plans: [{
    name: String,
    price: Number,
    keys: [String]
  }],
  active: { type: Boolean, default: true }
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  email: String,
  productTitle: String,
  plan: String,
  price: Number,
  status: String,
  proof: String,
  createdAt: { type: Date, default: Date.now }
}));

/* ================= UPLOAD ================= */

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* ================= STORE API ================= */

app.get("/api/products", async (_, res) => {
  res.json(await Product.find({ active: true }));
});

app.post("/api/order", async (req, res) => {
  const order = await Order.create({
    email: req.body.email,
    productTitle: req.body.productTitle,
    plan: req.body.plan,
    price: req.body.price,
    status: "pending"
  });
  res.json(order);
});

app.post("/api/order/:id/proof", upload.single("proof"), async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.proof = "/uploads/" + req.file.filename;
  order.status = "waiting_review";
  await order.save();
  res.json({ success: true });
});

/* ================= ADMIN ================= */

app.get("/api/admin/products", async (_, res) => {
  res.json(await Product.find());
});

app.post("/api/admin/products", async (req, res) => {
  res.json(await Product.create(req.body));
});

app.delete("/api/admin/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get("/api/admin/orders", async (_, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

/* ================= SERVER ================= */

app.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);
