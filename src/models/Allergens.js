const mongoose = require("mongoose");

const allergenSchema = new mongoose.Schema(
  {
    allergen: { type: String, required: true, unique: true },
    category: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

allergenSchema.index({ allergen: 1 });

module.exports = mongoose.model("Allergen", allergenSchema);
