// migrateAllergens.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateAllergens() {
  const snapshot = await db.collection("allergens").get();

  if (snapshot.empty) {
    console.log("⚠️ No documents found in allergens collection.");
    return;
  }

  console.log(`Found ${snapshot.size} documents. Updating...`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.allergen && !data.allergenLower) {
      const lower = data.allergen.toLowerCase();
      await doc.ref.update({ allergenLower: lower });
      console.log(`✅ Updated ${data.allergen} → ${lower}`);
      updated++;
    } else {
      console.log(`⏭️ Skipped ${doc.id} (already has allergenLower)`);
    }
  }

  console.log(`🎉 Migration finished. Updated ${updated} documents.`);
}

migrateAllergens().catch((err) => {
  console.error("Migration failed:", err);
});
