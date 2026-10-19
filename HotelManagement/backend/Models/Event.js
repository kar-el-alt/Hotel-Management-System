const mongoose = require("mongoose");

// Activity log: who did what, newest first in the UI
const eventSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // EVT-0001
    at: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true }, // e.g. booking.created
    actor: { type: String, default: "System" },
    summary: { type: String, required: true },
    ref: { type: String, default: "" },
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

module.exports = mongoose.model("Event", eventSchema);
