const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    type: { type: String, required: true },
    floor: { type: Number, required: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    description: { type: String, default: "" },
    amenities: [String],
    status: {
      type: String,
      enum: ["available", "occupied", "cleaning", "maintenance"],
      default: "available",
    },
    maintenanceNote: { type: String, default: "" },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.number;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Room", roomSchema);
