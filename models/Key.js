import mongoose from "mongoose";

const KeySchema = new mongoose.Schema({
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  value: String,
  used: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Key", KeySchema);
