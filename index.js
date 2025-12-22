require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("MongoDB connected"));

/* ================= MODELS ================= */
const User = mongoose.model("User", new mongoose.Schema({
  email:{type:String,unique:true},
  password:String,
  verified:{type:Boolean,default:false},
  code:String,
  codeExpires:Date
}));

/* ================= HELPERS ================= */
function genCode(){
  return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendEmail(to, code){
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { email: "no-reply@glomstore.com", name: "GLOM Store" },
      to: [{ email: to }],
      subject: "رمز التحقق - GLOM Store",
      htmlContent: `
        <div style="font-family:Arial;background:#0b0014;color:#fff;padding:30px">
          <h2 style="color:#b66bff">GLOM Store</h2>
          <p>رمز التحقق الخاص بك:</p>
          <div style="
            font-size:32px;
            letter-spacing:6px;
            margin:20px 0;
            font-weight:bold;
            color:#b66bff
          ">
            ${code}
          </div>
          <p>الرمز صالح لمدة 10 دقائق.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("EMAIL ERROR:", err);
    throw new Error("Email failed");
  }
}

/* ================= AUTH ================= */
app.post("/api/auth/register", async(req,res)=>{
  try {
    const {email,password} = req.body;
    const code = genCode();

    await User.findOneAndUpdate(
      {email},
      {
        email,
        password,
        verified:false,
        code,
        codeExpires: Date.now() + 10*60*1000
      },
      {upsert:true}
    );

    await sendEmail(email, code);

    res.json({success:true});
  } catch (e) {
    res.status(500).json({error:"Email send failed"});
  }
});

app.post("/api/auth/verify", async(req,res)=>{
  const {email,code} = req.body;
  const u = await User.findOne({email});

  if(!u || u.code !== code || u.codeExpires < Date.now())
    return res.status(400).json({error:"Invalid or expired code"});

  u.verified = true;
  u.code = null;
  await u.save();

  res.json({success:true});
});

app.post("/api/auth/login", async(req,res)=>{
  const {email,password} = req.body;
  const u = await User.findOne({email,password});

  if(!u) return res.status(400).json({error:"Wrong credentials"});
  if(!u.verified) return res.status(403).json({error:"Not verified"});

  res.json({success:true});
});

/* ================= SERVER ================= */
app.listen(process.env.PORT || 3000, ()=>{
  console.log("Server running");
});
