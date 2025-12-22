import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* ================= DATABASE ================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

/* ================= STORAGE (IMAGES) ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage });

/* ================= MODELS ================= */
const Product = mongoose.model("Product", new mongoose.Schema({
  title: String,
  description: String,
  images: [String],          // صور فعلية
  category: String,
  active: { type: Boolean, default: true },
  plans: [
    {
      name: String,
      price: Number,
      keys: [String]
    }
  ],
  createdAt: { type: Date, default: Date.now }
}));

/* ================= ADMIN APIs ================= */

/* ➕ إضافة منتج */
app.post("/api/admin/products", upload.array("images", 5), async (req, res) => {
  try {
    const images = req.files.map(f => `/uploads/${f.filename}`);

    const product = await Product.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      images,
      plans: [] // الفترات نضيفها لاحقًا
    });

    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "CREATE_PRODUCT_FAILED" });
  }
});

/* 📦 جلب المنتجات (Admin) */
app.get("/api/admin/products", async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

/* ✏️ تعديل منتج */
app.put("/api/admin/products/:id", async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(product);
});

/* 🗑️ حذف منتج */
app.delete("/api/admin/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ================= STORE API ================= */

/* 🛒 جلب المنتجات للمتجر */
app.get("/api/store/products", async (req, res) => {
  const q = { active: true };
  if (req.query.category) q.category = req.query.category;

  const products = await Product.find(q);
  res.json(products);
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
