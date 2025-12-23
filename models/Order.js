import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  status: { type: String, default: "pending" }, // pending | approved | rejected
  deliveredKey: String
}, { timestamps: true });

export default mongoose.model("Order", OrderSchema);
