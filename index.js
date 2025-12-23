import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

import Product from "./models/Product.js";
import Category from "./models/Category.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1/glom-store")
  .then(()=>console.log("MongoDB connected"));

/* ===== Upload ===== */
if (!fs.existsSync("uploads/products")) {
  fs.mkdirSync("uploads/products", { recursive: true });
}

const storage = multer.diskStorage({
  destination: "uploads/products",
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* ===== STORE APIs ===== */
app.get("/api/categories", async (_, res) => {
  res.json(await Category.find());
});

app.get("/api/products", async (_, res) => {
  res.json(await Product.find());
});

/* ===== ADMIN APIs ===== */
app.post("/api/admin/category", async (req, res) => {
  const name = req.body.name;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const cat = await Category.create({ name, slug });
  res.json(cat);
});

app.post("/api/admin/product", upload.single("image"), async (req, res) => {
  const product = await Product.create({
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    image: "/uploads/products/" + req.file.filename
  });
  res.json(product);
});

app.get("/api/admin/products", async (_, res) => {
  res.json(await Product.find());
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on", PORT));
