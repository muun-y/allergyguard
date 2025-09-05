// DOM refs
const input = document.getElementById("allergen-search");
const suggestions = document.getElementById("suggestions");
const addBtn = document.getElementById("add-typed");
const typedPreview = document.getElementById("typed-preview");
const helperMsg = document.getElementById("helper-msg");
const allergyList = document.getElementById("allergy-list");

let currentUser = null;

// --- 로그인된 유저 확인 ---
async function fetchCurrentUser() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) {
      console.log("⚠️ Not logged in");
      return;
    }
    currentUser = await res.json();
    console.log("✅ Authenticated:", currentUser.email);

    // 로그인 된 경우 알러지 목록도 로드
    loadAllergies();
  } catch (err) {
    console.error("Failed to fetch user:", err);
  }
}

// --- 알러지 목록 불러오기 ---
async function loadAllergies() {
  try {
    const res = await fetch("/api/me/allergies", { credentials: "include" });
    if (!res.ok) {
      console.log("⚠️ Failed to fetch allergies");
      return;
    }
    const allergies = await res.json();
    allergyList.innerHTML = "";

    if (allergies.length === 0) {
      allergyList.innerHTML = `<div class="text-sm text-gray-500">No allergies added yet.</div>`;
    } else {
      allergies.forEach((a) => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-3";
        li.innerHTML = `
          <span>${a.allergen}</span>
          <button class="text-red-600 underline text-sm"
                  type="button"
                  data-role="delete"
                  data-name="${a.allergen}">
            delete
          </button>`;
        allergyList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Error loading allergies:", err);
  }
}

// --- 자동완성 검색 ---
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
      `/api/allergens/search?q=${encodeURIComponent(queryText)}`,
      { credentials: "include" }
    );
    const results = await res.json();

    suggestions.innerHTML = "";
    if (results.length > 0) {
      results.forEach((allergen) => {
        const li = document.createElement("li");
        li.textContent = allergen.allergen;
        li.className = "px-3 py-2 cursor-pointer hover:bg-gray-100";
        li.addEventListener("click", () => {
          addAllergy(allergen.allergen);
        });
        suggestions.appendChild(li);
      });
      suggestions.classList.remove("hidden");
    } else {
      suggestions.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error fetching suggestions:", err);
  }
});

// --- Add typed allergen 버튼 ---
addBtn.addEventListener("click", () => {
  if (input.value.trim().length >= 2) {
    addAllergy(input.value.trim());
  }
});

// --- 알러지 추가 ---
async function addAllergy(allergenName) {
  if (!currentUser) {
    alert("Please log in to add allergies.");
    return;
  }

  try {
    const res = await fetch("/api/me/allergies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allergen: allergenName }),
      credentials: "include",
    });
    const data = await res.json();

    if (data.success) {
      helperMsg.textContent = `✅ Added ${allergenName}`;
      loadAllergies(); // 목록 다시 불러오기

      // 입력 초기화
      input.value = "";
      typedPreview.textContent = "";
      addBtn.disabled = true;
      suggestions.innerHTML = "";
      suggestions.classList.add("hidden");
    } else {
      helperMsg.textContent = "❌ Failed to add allergen.";
    }
  } catch (err) {
    console.error("Error adding allergy:", err);
    helperMsg.textContent = "❌ Failed to add allergy.";
  }
}

// --- 알러지 삭제 ---
document.addEventListener("click", async (e) => {
  if (e.target && e.target.dataset.role === "delete") {
    const allergenName = e.target.dataset.name;
    if (!currentUser) {
      alert("Please log in first.");
      return;
    }
    if (!confirm(`Delete ${allergenName}?`)) return;

    try {
      const res = await fetch(
        `/api/me/allergies/${encodeURIComponent(allergenName)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success) {
        helperMsg.textContent = `🗑️ Deleted ${allergenName}`;
        loadAllergies(); // 목록 다시 불러오기
      } else {
        helperMsg.textContent = "❌ Failed to delete allergy.";
      }
    } catch (err) {
      console.error("Error deleting allergy:", err);
      helperMsg.textContent = "❌ Failed to delete allergy.";
    }
  }
});

// --- 페이지 로드 시 실행 ---
fetchCurrentUser();
