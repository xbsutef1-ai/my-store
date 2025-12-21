require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   DATABASE
=============================== */
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("MongoDB connected"));

/* ===============================
   MODELS
=============================== */
const User = mongoose.model("User", new mongoose.Schema({
  email:String,
  role:{type:String,enum:["admin","support","user"],default:"admin"}
}));

const Category = mongoose.model("Category", new mongoose.Schema({
  name:String,
  slug:String,
  order:Number
}));

const Product = mongoose.model("Product", new mongoose.Schema({
  title:String,
  description:String,
  images:[String],
  category:String,
  active:{type:Boolean,default:true},
  plans:[{
    name:String,
    price:Number,
    durationDays:Number,
    keys:[String]
  }],
  createdAt:{type:Date,default:Date.now}
}));

const Coupon = mongoose.model("Coupon", new mongoose.Schema({
  code:{type:String,unique:true},
  discountPercent:Number,
  startsAt:Date,
  expiresAt:Date,
  active:{type:Boolean,default:true},
  productId:String,
  planName:String
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  userEmail:String,
  items:[{
    productId:String,
    title:String,
    plan:String,
    price:Number
  }],
  total:Number,
  finalTotal:Number,
  couponCode:String,
  status:String,
  paymentProof:String,
  paymentReference:String,
  delivery:String,
  createdAt:{type:Date,default:Date.now}
}));

/* ===============================
   AUTH
=============================== */
function adminOnly(req,res,next){
  const token=req.headers.authorization?.split(" ")[1];
  if(!token) return res.sendStatus(401);
  try{
    const d=jwt.verify(token,process.env.JWT_SECRET);
    if(d.role!=="admin") return res.sendStatus(403);
    next();
  }catch{res.sendStatus(401);}
}

/* ===============================
   STORE API
=============================== */
app.get("/api/store/categories", async(req,res)=>{
  res.json(await Category.find().sort({order:1}));
});

app.get("/api/store/products", async(req,res)=>{
  const q={active:true};
  if(req.query.category) q.category=req.query.category;
  res.json(await Product.find(q));
});

app.post("/api/store/validate-coupon", async(req,res)=>{
  const {code,price,productId,planName}=req.body;
  const c=await Coupon.findOne({code,active:true});
  if(!c) return res.status(400).json({error:"Invalid coupon"});

  const now=new Date();
  if(c.startsAt && now<c.startsAt) return res.status(400).json({error:"Not started"});
  if(c.expiresAt && now>c.expiresAt) return res.status(400).json({error:"Expired"});
  if(c.productId && c.productId!==productId) return res.status(400).json({error:"Wrong product"});
  if(c.planName && c.planName!==planName) return res.status(400).json({error:"Wrong plan"});

  const discount=Math.round(price*(c.discountPercent/100));
  res.json({finalPrice:price-discount,discount});
});

app.post("/api/store/order", async(req,res)=>{
  const {email,product,price,coupon}=req.body;
  const order=await Order.create({
    userEmail:email,
    items:[product],
    total:price,
    finalTotal:price,
    couponCode:coupon||null,
    status:"pending"
  });
  res.json({orderId:order._id});
});

app.post("/api/store/order/:id/payment", async(req,res)=>{
  const o=await Order.findById(req.params.id);
  o.paymentProof=req.body.proofUrl;
  o.paymentReference=req.body.reference;
  o.status="waiting_payment";
  await o.save();
  res.json({success:true});
});

app.get("/api/store/my-orders", async(req,res)=>{
  res.json(await Order.find({userEmail:req.query.email}).sort({createdAt:-1}));
});

/* ===============================
   ADMIN API
=============================== */
app.get("/api/admin/products", adminOnly, async(req,res)=>{
  res.json(await Product.find());
});

app.post("/api/admin/products", adminOnly, async(req,res)=>{
  res.json(await Product.create(req.body));
});

app.put("/api/admin/products/:id", adminOnly, async(req,res)=>{
  res.json(await Product.findByIdAndUpdate(req.params.id,req.body,{new:true}));
});

app.delete("/api/admin/products/:id", adminOnly, async(req,res)=>{
  await Product.findByIdAndDelete(req.params.id);
  res.json({success:true});
});

app.get("/api/admin/orders", adminOnly, async(req,res)=>{
  res.json(await Order.find().sort({createdAt:-1}));
});

app.post("/api/admin/orders/:id/approve", adminOnly, async(req,res)=>{
  const o=await Order.findById(req.params.id);
  const p=await Product.findById(o.items[0].productId);
  const plan=p.plans.find(x=>x.name===o.items[0].plan);
  const key=plan.keys.shift();
  o.delivery=key;
  o.status="delivered";
  await p.save();
  await o.save();
  res.json({success:true});
});

/* ===============================
   SERVER
=============================== */
app.listen(process.env.PORT||3000,()=>{
  console.log("GLOM Store running");
});
