import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  title: String,
  description: String,
  images: [String],
  category: String
}, { timestamps: true });

export default mongoose.model("Product", ProductSchema);
