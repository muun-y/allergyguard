// DOM refs
const input = document.getElementById("allergen-search");
const suggestions = document.getElementById("suggestions");
const addBtn = document.getElementById("add-typed");
const typedPreview = document.getElementById("typed-preview");
const helperMsg = document.getElementById("helper-msg");

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

  try {
    const res = await fetch(
      `/api/allergens/search?q=${encodeURIComponent(queryText)}`
    );
    const results = await res.json();

    console.log("🔍 Results:", results);

    suggestions.innerHTML = "";
    if (results.length > 0) {
      results.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.allergen;
        li.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
        li.addEventListener("click", () => {
          addAllergy(item.allergen);
        });
        suggestions.appendChild(li);
      });
      suggestions.classList.remove("hidden");
    } else {
      suggestions.classList.add("hidden");
    }
  } catch (err) {
    console.error("Autocomplete error:", err);
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
  try {
    const res = await fetch("/api/me/allergies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allergen: allergenName }),
    });
    const data = await res.json();

    if (data.success) {
      helperMsg.textContent = `✅ Added ${allergenName}`;
      input.value = "";
      typedPreview.textContent = "";
      addBtn.disabled = true;
      suggestions.innerHTML = "";
      suggestions.classList.add("hidden");

      // 간단하게 새로고침
      setTimeout(() => window.location.reload(), 800);
    } else {
      helperMsg.textContent = "❌ Failed to add allergy.";
    }
  } catch (err) {
    console.error("Error adding allergy:", err);
    helperMsg.textContent = "❌ Error adding allergy.";
  }
}

// --- Delete allergy (delegated) ---
document.addEventListener("click", async (e) => {
  if (e.target && e.target.dataset.role === "delete") {
    const allergenName = e.target.dataset.name;
    if (!confirm(`Delete ${allergenName}?`)) return;

    try {
      // 백엔드에 DELETE 라우트 따로 만들면 좋음
      const res = await fetch(
        `/api/me/allergies/${encodeURIComponent(allergenName)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();

      if (data.success) {
        helperMsg.textContent = `🗑️ Deleted ${allergenName}`;
        setTimeout(() => window.location.reload(), 800);
      } else {
        helperMsg.textContent = "❌ Failed to delete allergy.";
      }
    } catch (err) {
      console.error("Error deleting allergy:", err);
      helperMsg.textContent = "❌ Error deleting allergy.";
    }
  }
});
