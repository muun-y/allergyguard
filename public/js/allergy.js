// Firebase config
const firebaseConfig = {
  apiKey: "<%= process.env.FIREBASE_API_KEY %>",
  authDomain: "<%= process.env.FIREBASE_AUTH_DOMAIN %>",
  projectId: "<%= process.env.FIREBASE_PROJECT_ID %>",
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// DOM refs
const input = document.getElementById("allergen-search");
const suggestions = document.getElementById("suggestions");
const addBtn = document.getElementById("add-typed");
const typedPreview = document.getElementById("typed-preview");
const helperMsg = document.getElementById("helper-msg");
const allergyList = document.getElementById("allergy-list");

let currentUser = null;

// Check the authorization
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    console.log("✅ Authenticated:", user.uid);
  } else {
    currentUser = null;
    console.log("⚠️ Not logged in");
  }
});

// --- Add allergy function (Firestore에 저장) ---
async function addAllergy(allergenName) {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  try {
    await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("allergies")
      .doc(allergenName.toLowerCase())
      .set({
        allergen: allergenName,
        addedAt: new Date(),
      });

    helperMsg.textContent = `✅ Added ${allergenName}`;

    // Update DOM
    let list = document.getElementById("allergy-list");
    if (!list) {
      list = document.createElement("ul");
      list.id = "allergy-list";
      list.className = "list-disc pl-6 space-y-1";
      const container = document.querySelector("h3.text-lg").parentNode;
      container.appendChild(list);
    }

    const li = document.createElement("li");
    li.className = "flex items-center gap-3";
    li.innerHTML = `
      <span>${allergenName}</span>
      <button class="text-red-600 underline text-sm"
              type="button"
              data-role="delete"
              data-name="${allergenName}">
        delete
      </button>`;
    list.appendChild(li);

    // 입력 초기화
    input.value = "";
    typedPreview.textContent = "";
    addBtn.disabled = true;
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
  } catch (err) {
    console.error("Error adding allergy:", err);
    helperMsg.textContent = "❌ Failed to add allergy.";
  }
}

// --- Delete allergy ---
document.addEventListener("click", async (e) => {
  if (e.target && e.target.dataset.role === "delete") {
    const allergenName = e.target.dataset.name;
    if (!currentUser) return alert("Please log in first.");
    if (!confirm(`Delete ${allergenName}?`)) return;

    try {
      await db
        .collection("users")
        .doc(currentUser.uid)
        .collection("allergies")
        .doc(allergenName.toLowerCase())
        .delete();

      helperMsg.textContent = `🗑️ Deleted ${allergenName}`;
      e.target.closest("li").remove();
    } catch (err) {
      console.error("Error deleting allergy:", err);
      helperMsg.textContent = "❌ Failed to delete allergy.";
    }
  }
});

// --- Add Button Event ---
addBtn.addEventListener("click", () => {
  if (input.value.trim().length >= 2) {
    addAllergy(input.value.trim());
  }
});
