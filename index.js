require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("MongoDB connected"));

/* ================= MODELS ================= */
const Product = mongoose.model("Product", new mongoose.Schema({
  title:String,
  description:String,
  images:[String],
  plans:[{
    name:String,
    price:Number,
    keys:[String]
  }],
  active:{type:Boolean,default:true}
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  userEmail:String,
  items:[{ productId:String,title:String,plan:String,price:Number }],
  finalTotal:Number,
  status:String,
  payment:{
    ref:String,
    proofUrl:String,
    flag:String
  },
  delivery:String,
  createdAt:{type:Date,default:Date.now}
}));

const ProofHash = mongoose.model("ProofHash", new mongoose.Schema({
  hash:String,
  orderId:String,
  createdAt:{type:Date,default:Date.now}
}));

/* ================= HELPERS ================= */
function md5(x){
  return crypto.createHash("md5").update(x).digest("hex");
}

/* ================= STORE ================= */
app.get("/api/store/products", async(req,res)=>{
  res.json(await Product.find({active:true}));
});

app.post("/api/store/order", async(req,res)=>{
  const o = await Order.create({
    userEmail:req.body.email,
    items:[req.body.product],
    finalTotal:req.body.price,
    status:"pending"
  });
  res.json({orderId:o._id});
});

app.post("/api/store/order/:id/payment", async(req,res)=>{
  const o = await Order.findById(req.params.id);
  const h = md5(req.body.proofUrl);
  const dup = await ProofHash.findOne({hash:h});

  let flag="clear";
  if(dup) flag="fraud";
  else if(!req.body.reference || req.body.reference.length<6) flag="suspicious";

  await ProofHash.create({hash:h,orderId:o._id});

  o.payment={
    ref:req.body.reference,
    proofUrl:req.body.proofUrl,
    flag
  };
  o.status="waiting_review";
  await o.save();

  res.json({flag});
});

/* ================= ADMIN ================= */
const upload = multer({dest:"uploads/keys"});

app.get("/api/admin/products", async(req,res)=>{
  res.json(await Product.find());
});

app.post("/api/admin/products/:id/plan", async(req,res)=>{
  const p = await Product.findById(req.params.id);
  p.plans.push({name:req.body.name,price:req.body.price,keys:[]});
  await p.save();
  res.json(p);
});

app.post(
  "/api/admin/products/:pid/plan/:plan/upload-keys",
  upload.single("file"),
  async(req,res)=>{
    const keys = fs.readFileSync(req.file.path,"utf8")
      .split("\n").map(x=>x.trim()).filter(Boolean);

    const p = await Product.findById(req.params.pid);
    const pl = p.plans.find(x=>x.name===req.params.plan);
    pl.keys.push(...keys);
    await p.save();

    res.json({added:keys.length});
  }
);

app.get("/api/admin/orders", async(req,res)=>{
  res.json(await Order.find().sort({createdAt:-1}));
});

app.post("/api/admin/orders/:id/approve", async(req,res)=>{
  const o = await Order.findById(req.params.id);
  const p = await Product.findById(o.items[0].productId);
  const pl = p.plans.find(x=>x.name===o.items[0].plan);
  const key = pl.keys.shift();

  o.delivery=key;
  o.status="delivered";
  await p.save();
  await o.save();

  res.json({success:true});
});

/* ================= SERVER ================= */
app.listen(process.env.PORT||3000,()=>{
  console.log("Server running");
});
