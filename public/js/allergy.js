// public/js/allergy.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Firebase config (EJS에서 env 넘겨주기)
const firebaseConfig = {
  apiKey: "<%= process.env.FIREBASE_API_KEY %>",
  authDomain: "<%= process.env.FIREBASE_AUTH_DOMAIN %>",
  projectId: "<%= process.env.FIREBASE_PROJECT_ID %>",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM refs
const input = document.getElementById("allergen-search");
const suggestions = document.getElementById("suggestions");
const addBtn = document.getElementById("add-typed");
const typedPreview = document.getElementById("typed-preview");
const helperMsg = document.getElementById("helper-msg");

let currentUser = null;

// Track auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("✅ Authenticated:", user.email);
  } else {
    currentUser = null;
    console.log("⚠️ Not logged in");
  }
});

// --- Search autocomplete ---
input.addEventListener("input", async () => {
  const queryText = input.value.trim();
  typedPreview.textContent = queryText;
  addBtn.disabled = queryText.length < 2;

  if (queryText.length < 2) {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
    return;
  }

  // Firestore query
  const q = query(
    collection(db, "allergens"),
    where("allergen", ">=", queryText),
    where("allergen", "<=", queryText + "\uf8ff")
  );

  const snapshot = await getDocs(q);
  suggestions.innerHTML = "";
  if (!snapshot.empty) {
    snapshot.forEach((docSnap) => {
      const allergenData = docSnap.data();
      const li = document.createElement("li");
      li.textContent = allergenData.allergen;
      li.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
      li.addEventListener("click", () => {
        addAllergy(allergenData.allergen);
      });
      suggestions.appendChild(li);
    });
    suggestions.classList.remove("hidden");
  } else {
    suggestions.classList.add("hidden");
  }
});

// --- Add typed allergen ---
addBtn.addEventListener("click", () => {
  if (input.value.trim().length >= 2) {
    addAllergy(input.value.trim());
  }
});

// --- Add allergy function ---
async function addAllergy(allergenName) {
  if (!currentUser) {
    alert("Please log in to add allergies.");
    return;
  }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "allergies"), {
      allergen: allergenName,
      createdAt: new Date(),
    });
    helperMsg.textContent = `✅ Added ${allergenName}`;
    input.value = "";
    typedPreview.textContent = "";
    addBtn.disabled = true;
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");

    // Reload page (간단히)
    setTimeout(() => window.location.reload(), 800);
  } catch (err) {
    console.error("Error adding allergy:", err);
    helperMsg.textContent = "❌ Failed to add allergy.";
  }
}

// --- Delete allergy (delegated) ---
document.addEventListener("click", async (e) => {
  if (e.target && e.target.dataset.role === "delete") {
    const allergenName = e.target.dataset.name;
    if (!currentUser) return alert("Please log in");

    if (!confirm(`Delete ${allergenName}?`)) return;

    try {
      // Find matching doc in user's allergies subcollection
      const q = query(
        collection(db, "users", currentUser.uid, "allergies"),
        where("allergen", "==", allergenName)
      );
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(
          doc(db, "users", currentUser.uid, "allergies", docSnap.id)
        );
      }
      helperMsg.textContent = `🗑️ Deleted ${allergenName}`;
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Error deleting allergy:", err);
      helperMsg.textContent = "❌ Failed to delete allergy.";
    }
  }
});
