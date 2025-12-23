import express from "express";
import mongoose from "mongoose";
import multer from "multer";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

await mongoose.connect(process.env.MONGO_URI);

/* ===== Upload ===== */
const storage = multer.diskStorage({
  destination:"uploads/proofs",
  filename:(req,file,cb)=>{
    cb(null,Date.now()+"-"+file.originalname);
  }
});
const upload = multer({ storage });

/* ===== Models ===== */
const Product = mongoose.model("Product", new mongoose.Schema({
  title:String,
  description:String,
  images:[String],
  categorySlug:String
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  productId:String,
  reference:String,
  proof:String,
  status:{ type:String, default:"waiting_discord" }
}));

/* ===== Store ===== */
app.get("/api/store/products", async(req,res)=>{
  res.json(await Product.find());
});

app.post("/api/store/order", async(req,res)=>{
  const o = await Order.create({ productId:req.body.productId });
  res.json({ orderId:o._id });
});

app.post("/api/store/order/:id/proof",
  upload.single("proof"),
  async(req,res)=>{
    const o = await Order.findById(req.params.id);
    o.reference = req.body.reference;
    o.proof = "/uploads/proofs/"+req.file.filename;
    o.status = "waiting_discord";
    await o.save();

    res.json({ ok:true });
  }
);

/* ===== Start ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("Server running",PORT));
