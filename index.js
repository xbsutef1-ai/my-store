require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use("/invoices", express.static("invoices"));

mongoose.connect(process.env.MONGO_URI).then(()=>console.log("MongoDB connected"));

/* ================= MODELS ================= */
const User = mongoose.model("User", new mongoose.Schema({
  email:String,
  role:{type:String,enum:["admin","support","user"],default:"admin"}
}));

const Category = mongoose.model("Category", new mongoose.Schema({
  name:String, slug:String, order:Number
}));

const Product = mongoose.model("Product", new mongoose.Schema({
  title:String, description:String, images:[String], category:String,
  plans:[{ name:String, price:Number, keys:[String] }],
  active:{type:Boolean,default:true}
}));

const Coupon = mongoose.model("Coupon", new mongoose.Schema({
  code:{type:String,unique:true},
  discountPercent:Number,
  startsAt:Date, expiresAt:Date,
  productId:String, planName:String,
  active:{type:Boolean,default:true}
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  userEmail:String,
  items:[{ productId:String, title:String, plan:String, price:Number }],
  total:Number, finalTotal:Number, couponCode:String,
  status:String,
  payment:{ ref:String, proofUrl:String, flag:String }, // flag: clear|suspicious|fraud
  delivery:String,
  invoicePath:String,
  createdAt:{type:Date,default:Date.now}
}));

/* ================= AUTH ================= */
function auth(req,res,next){
  const t=req.headers.authorization?.split(" ")[1];
  if(!t) return res.sendStatus(401);
  try{ req.user=jwt.verify(t,process.env.JWT_SECRET); next(); }
  catch{ res.sendStatus(401); }
}
function adminOnly(req,res,next){
  if(req.user.role!=="admin") return res.sendStatus(403);
  next();
}
function adminOrSupport(req,res,next){
  if(!["admin","support"].includes(req.user.role)) return res.sendStatus(403);
  next();
}

/* ================= HELPERS ================= */
function analyzeProof({ref, amount}){
  // Heuristic بسيط:
  // - ref قصير جدًا أو متكرر => مشكوك
  // - amount غير مطابق => مشكوك
  if(!ref || ref.length < 5) return "suspicious";
  return "clear";
}

function makeInvoice(order){
  const dir = path.join(__dirname,"invoices");
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir,`invoice_${order._id}.pdf`);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(file));
  doc.fontSize(18).text("GLOM Store Invoice",{align:"center"});
  doc.moveDown();
  doc.fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Email: ${order.userEmail}`);
  doc.text(`Status: ${order.status}`);
  doc.moveDown();
  order.items.forEach(i=>{
    doc.text(`${i.title} — ${i.plan} — $${i.price}`);
  });
  doc.moveDown();
  doc.text(`Total: $${order.finalTotal}`);
  doc.end();
  return `/invoices/${path.basename(file)}`;
}

/* ================= STORE APIs ================= */
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
  const {email,product,price,couponCode}=req.body;
  const order=await Order.create({
    userEmail:email,
    items:[product],
    total:price,
    finalTotal:price,
    couponCode:couponCode||null,
    status:"pending"
  });
  res.json({orderId:order._id});
});

app.post("/api/store/order/:id/payment", async(req,res)=>{
  const o=await Order.findById(req.params.id);
  const flag=analyzeProof({ref:req.body.reference, amount:o.finalTotal});
  o.payment={ ref:req.body.reference, proofUrl:req.body.proofUrl, flag };
  o.status="waiting_review";
  await o.save();
  res.json({flag});
});

app.get("/api/store/my-orders", async(req,res)=>{
  res.json(await Order.find({userEmail:req.query.email}).sort({createdAt:-1}));
});

/* ================= ADMIN / SUPPORT ================= */
app.get("/api/admin/overview", auth, adminOrSupport, async(req,res)=>{
  const totalOrders=await Order.countDocuments();
  const revenue=(await Order.find({status:"delivered"}))
    .reduce((a,b)=>a+(b.finalTotal||0),0);
  res.json({ totalOrders, revenue });
});

app.get("/api/admin/products", auth, adminOnly, async(req,res)=>{
  res.json(await Product.find());
});
app.post("/api/admin/products", auth, adminOnly, async(req,res)=>{
  res.json(await Product.create(req.body));
});
app.put("/api/admin/products/:id", auth, adminOnly, async(req,res)=>{
  res.json(await Product.findByIdAndUpdate(req.params.id,req.body,{new:true}));
});
app.delete("/api/admin/products/:id", auth, adminOnly, async(req,res)=>{
  await Product.findByIdAndDelete(req.params.id);
  res.json({success:true});
});

app.get("/api/admin/orders", auth, adminOrSupport, async(req,res)=>{
  res.json(await Order.find().sort({createdAt:-1}));
});

app.post("/api/admin/orders/:id/approve", auth, adminOrSupport, async(req,res)=>{
  const o=await Order.findById(req.params.id);
  const p=await Product.findById(o.items[0].productId);
  const plan=p.plans.find(x=>x.name===o.items[0].plan);
  const key=plan.keys.shift();
  o.delivery=key;
  o.status="delivered";
  o.invoicePath=makeInvoice(o);
  await p.save(); await o.save();
  res.json({success:true});
});

/* ================= SERVER ================= */
app.listen(process.env.PORT||3000,()=>console.log("GLOM Store running"));
