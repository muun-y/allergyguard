const fs = require("fs");
const db = require("../src/config/firebaseAdmin");

async function importAllergens() {
  const raw = fs.readFileSync("./data/allergens.json", "utf8");
  const allergens = JSON.parse(raw);

  console.log("📦 Importing allergens...");

  for (const a of allergens) {
    const clean = {
      allergen: String(a.allergen).trim(),
      category: String(a.category).trim(),
      notes: String(a.notes).trim(),
    };

    await db.collection("allergens").add(clean);
    console.log("✅ Inserted:", clean.allergen);
  }

  console.log(`✅ Imported ${allergens.length} allergens`);
  process.exit(0);
}

importAllergens().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
