import express from "express";
import mongoose from "mongoose";
import multer from "multer";

const app = express();
app.use(express.json());
app.use(express.static("public"));

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
    price: Number,
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
  status: String, // waiting_payment | waiting_admin | delivered | rejected
  payment: {
    proofUrl: String,
    detectedAmount: Number,
    expectedAmount: Number,
    flag: String
  },
  delivery: String,
  createdAt: { type: Date, default: Date.now }
}));

/* ======================================================
   ================ ADMIN PRODUCTS ======================
   ====================================================== */

// إضافة منتج + رفع صورة
app.post("/api/admin/products", upload.single("image"), async (req, res) => {
  try {
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "API_ERROR" });
  }
});

// جلب كل المنتجات
app.get("/api/admin/products", async (req, res) => {
  res.json(await Product.find());
});

// حذف منتج
app.delete("/api/admin/product/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// إضافة خطة (Plan)
app.post("/api/admin/product/:id/plan", async (req, res) => {
  const { name, price } = req.body;
  const product = await Product.findById(req.params.id);

  product.plans.push({
    name,
    price: Number(price),
    keys: []
  });

  await product.save();
  res.json({ success: true });
});

// إضافة مفتاح
app.post("/api/admin/product/:pid/plan/:pname/key", async (req, res) => {
  const { key } = req.body;
  const product = await Product.findById(req.params.pid);
  const plan = product.plans.find(p => p.name === req.params.pname);

  plan.keys.push(key);
  await product.save();
  res.json({ success: true });
});

/* ======================================================
   ============== REVIEW ORDERS (ADMIN) =================
   ====================================================== */

// الطلبات المشكوك فيها
app.get("/api/admin/review-orders", async (req, res) => {
  const orders = await Order.find({ status: "waiting_admin" })
    .sort({ createdAt: -1 });
  res.json(orders);
});

// قبول وتسليم
app.post("/api/admin/order/:id/approve", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });

  const product = await Product.findById(order.items[0].productId);
  const plan = product.plans.find(p => p.name === order.items[0].plan);

  if (!plan || !plan.keys.length) {
    order.status = "out_of_stock";
    await order.save();
    return res.json({ error: "OUT_OF_STOCK" });
  }

  const key = plan.keys.shift();
  await product.save();

  order.delivery = key;
  order.status = "delivered";
  await order.save();

  res.json({ success: true });
});

// رفض الطلب
app.post("/api/admin/order/:id/reject", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });

  order.status = "rejected";
  await order.save();

  res.json({ success: true });
});

/* ======================================================
   ===================== STATS ==========================
   ====================================================== */

app.get("/api/admin/orders-stats", async (req, res) => {
  const suspicious = await Order.countDocuments({ status: "waiting_admin" });
  const approved = await Order.countDocuments({ status: "delivered" });
  const rejected = await Order.countDocuments({ status: "rejected" });

  res.json({ suspicious, approved, rejected });
});

export default app;
