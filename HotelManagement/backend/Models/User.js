const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // USR-01 (the frontend reads it as user.id)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["Admin", "Front Desk", "Staff", "Guest"], default: "Guest" },
    password: { type: String, required: true }, // bcrypt hash, never plain text
    active: { type: Boolean, default: true },
    deactivationReason: { type: String, default: "" },
    createdAt: { type: String, required: true }, // YYYY-MM-DD
    resetCode: { type: String, select: false },
    resetExpires: { type: Number, select: false },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret.code;
        delete ret.code;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.resetCode;
        delete ret.resetExpires;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("User", userSchema);
