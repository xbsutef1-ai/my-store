import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  price: Number
}, { timestamps: true });

export default mongoose.model("Plan", PlanSchema);
