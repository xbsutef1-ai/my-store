import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import User from "./models/User.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ===== DB =====
await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");

// ===== Auth middleware =====
function auth(req, res, next){
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if(!token) return res.status(401).json({ error: "NO_TOKEN" });
  try{
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  }catch{
    return res.status(401).json({ error: "BAD_TOKEN" });
  }
}

function admin(req, res, next){
  if(req.user.role !== "admin")
    return res.status(403).json({ error: "NOT_ADMIN" });
  next();
}

// ===== AUTH ROUTES =====
app.post("/api/auth/register", async (req, res)=>{
  try{
    const { email, password, name } = req.body;
    if(!email || !password || !name)
      return res.status(400).json({ error:"MISSING_FIELDS" });

    const exists = await User.findOne({ email });
    if(exists)
      return res.status(400).json({ error:"EMAIL_EXISTS" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash, name });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, email: user.email, name: user.name, role: user.role });
  }catch{
    res.status(500).json({ error:"REGISTER_FAILED" });
  }
});

app.post("/api/auth/login", async (req, res)=>{
  try{
    const { email, password } = req.body;
    if(!email || !password)
      return res.status(400).json({ error:"MISSING_FIELDS" });

    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ error:"INVALID" });

    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ error:"INVALID" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, email: user.email, name: user.name, role: user.role });
  }catch{
    res.status(500).json({ error:"LOGIN_FAILED" });
  }
});

// ===== ADMIN TEST =====
app.get("/api/admin/ping", auth, admin, (req,res)=>{
  res.json({ ok:true });
});

// ===== SPA fallback =====
app.get("*",(req,res)=>{
  res.sendFile(path.resolve("public/index.html"));
});

// ===== START =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log("Server running on", PORT));
