import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Link",
  },
  alias: String,
  ip: String,
  userAgent: String,
  referer: String,
  country: String,
  city: String,
  device: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Click", clickSchema);
