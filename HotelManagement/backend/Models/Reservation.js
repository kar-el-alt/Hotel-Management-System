const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // RSV-1001 (the frontend reads it as id)
    guest: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    roomNumber: { type: Number, required: true },
    checkIn: { type: String, required: true }, // YYYY-MM-DD
    checkOut: { type: String, required: true }, // YYYY-MM-DD
    occupants: [
      {
        _id: false,
        name: String,
        type: { type: String, enum: ["Adult", "Child"] },
      },
    ],
    guests: { type: Number, required: true },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["confirmed", "checked-in", "checked-out", "cancelled"],
      default: "confirmed",
    },
    total: { type: Number, required: true },
    downpayment: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    payment: {
      method: { type: String, enum: ["GCash", "Card", "Cash"], default: "Cash" },
      reference: { type: String, default: "" },
      amount: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: "" },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    forfeited: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.code;
        delete ret.code;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reservationSchema.index({ roomNumber: 1, checkIn: 1, checkOut: 1 });
reservationSchema.index({ email: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
