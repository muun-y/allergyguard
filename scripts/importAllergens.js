const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Allergen = require("../"); // model도 require로

dotenv.config();

const MONGO_URI = process.env.MONGODB_URL;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const ops = [];

  fs.createReadStream("./data/allergens.csv")
    .pipe(csv())
    .on("data", (row) => {
      ops.push({
        updateOne: {
          filter: { allergen: row.allergen },
          update: { $set: row },
          upsert: true,
        },
      });
    })
    .on("end", async () => {
      if (ops.length > 0) {
        await Allergen.bulkWrite(ops, { ordered: false });
        console.log(`✅ Imported ${ops.length} allergens`);
      } else {
        console.log("⚠️ No rows found in CSV");
      }
      await mongoose.disconnect();
    });
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
