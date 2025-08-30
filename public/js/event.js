document.addEventListener("DOMContentLoaded", () => {
  // New thread image upload
  document
    .getElementById("image-upload")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      const previewContainer = document.querySelector(".image-preview");

      if (file) {
        const reader = new FileReader();

        // If the file is an image, display it
        reader.onload = function (e) {
          previewContainer.innerHTML = `
            <div class="px-8">
                <div class="relative inline-block w-2/3">
                    <img src="${e.target.result}" alt="Image Preview" class="w-full h-auto rounded-lg object-cover">
                    <button class="absolute h-7 w-7 top-0 right-0 mt-2 mr-2 bg-gray-600 text-white rounded-full p-1 remove-image flex justify-center items-center" aria-label="Remove image ">
                        <div>X</div>
                    </button>
                </div>
            </div>
          `;

          // Attach event listener to remove button
          document
            .querySelector(".remove-image")
            .addEventListener("click", function () {
              previewContainer.innerHTML = ""; // Clear preview container
              document.getElementById("image-upload").value = ""; // Clear the file input
            });
        };

        reader.readAsDataURL(file);
      } else {
        // If the file is not an image, clear the preview
        previewContainer.innerHTML = "";
      }
    });

  // Like functionality for threads and comments
  document.querySelectorAll(".like-icon").forEach(function (likeIcon) {
    likeIcon.addEventListener("click", function () {
      const liked = likeIcon.getAttribute("data-liked") === "true";
      const newLikedState = !liked;

      // Update like icon appearance
      likeIcon.style.fill = newLikedState ? "red" : "white";
      likeIcon.style.stroke = newLikedState ? "red" : "black";
      likeIcon.setAttribute("data-liked", newLikedState);

      // Determine if it's a thread or comment like
      const thread = likeIcon.closest("[data-thread-id]");
      const comment = likeIcon.closest("[data-comment-id]");

      // Like count element and ID
      const likeCountElem = thread
        ? thread.querySelector(".like-count")
        : comment.querySelector(".like-count");
      let likeCount = parseInt(likeCountElem.textContent, 10);
      likeCountElem.textContent = newLikedState ? likeCount + 1 : likeCount - 1;

      const id = thread
        ? thread.getAttribute("data-thread-id")
        : comment.getAttribute("data-comment-id");

      // Fetch request body based on thread or comment
      const requestBody = thread
        ? { thread_id: id, liked: newLikedState }
        : { comment_id: id, liked: newLikedState };

      fetch("/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data.success) {
            // Revert like icon and count on failure
            likeIcon.style.fill = liked ? "red" : "white";
            likeIcon.style.stroke = liked ? "red" : "black";
            likeIcon.setAttribute("data-liked", liked);
            likeCountElem.textContent = liked ? likeCount + 1 : likeCount - 1;
          }
        })
        .catch((error) => {
          console.error("Error updating like status:", error);
          // Revert like icon and count on error
          likeIcon.style.fill = liked ? "red" : "white";
          likeIcon.style.stroke = liked ? "red" : "black";
          likeIcon.setAttribute("data-liked", liked);
          likeCountElem.textContent = liked ? likeCount + 1 : likeCount - 1;
        });
    });
  });
});

function threadToggleOptions(threadId) {
  const optionsMenu = document.getElementById(`thread-options-${threadId}`);
  optionsMenu.classList.toggle("hidden");
}

// 스레드 수정 함수
function editThread(threadId) {
  // 기존 내용 저장
  const contentEl = document.querySelector(
    `[data-thread-id="${threadId}"] .text-gray-800`
  );
  const originalContent = contentEl.innerText;

  // 텍스트 영역으로 전환
  contentEl.innerHTML = `<textarea id="edit-thread-content-${threadId}" class="w-full p-2 border rounded">${originalContent}</textarea>`;

  // 저장 및 취소 버튼 추가
  contentEl.insertAdjacentHTML(
    "afterend",
    `
        <div id="edit-buttons-${threadId}">
            <button onclick="saveThread(${threadId})" class="mt-2 text-blue-500 hover:underline">Save</button>
            <button onclick="cancelThreadEdit(${threadId}, '${originalContent}')" class="mt-2 ml-2 text-gray-500 hover:underline">Cancel</button>
        </div>
    `
  );

  threadToggleOptions(threadId); // 옵션 메뉴 닫기
}

// 스레드 삭제 함수
function deleteThread(threadId) {
  if (confirm("Are you sure you want to delete this thread?")) {
    fetch(`/delete-thread/${threadId}`, { method: "DELETE" })
      .then((response) => {
        if (response.ok) {
          location.href = "/"; // 삭제 후 홈으로 이동
        } else {
          alert("Failed to delete thread");
        }
      })
      .catch((error) => console.error("Error deleting thread:", error));
  }
}

// 스레드 저장 함수
function saveThread(threadId) {
  const editedContent = document.getElementById(
    `edit-thread-content-${threadId}`
  ).value;

  fetch(`/edit-thread/${threadId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: editedContent }),
  })
    .then((response) => {
      if (response.ok) {
        location.reload(); // 성공 시 페이지 새로고침
      } else {
        alert("Failed to save thread");
      }
    })
    .catch((error) => console.error("Error saving thread:", error));
}

// 팔로우 리스트를 보여주는 함수
async function showFollowingList() {
  const listContainer = document.getElementById("following-list");

  // 이미 리스트가 로드되어 있다면 보여주기만 함
  if (!listContainer.classList.contains("hidden")) {
    listContainer.classList.add("hidden");
    return;
  }

  try {
    // 서버에서 팔로우 리스트 가져오기
    const response = await fetch("/api/following");
    if (!response.ok) throw new Error("Failed to fetch following list");

    const following = await response.json();

    // 리스트를 초기화하고 새로운 데이터 추가
    listContainer.innerHTML = "";
    following.forEach((user) => {
      const item = document.createElement("div");
      item.textContent = `${user.username} (${user.email})`;
      item.classList.add(
        "p-2",
        "hover:bg-gray-200",
        "cursor-pointer",
        "border-b"
      );

      // 클릭 시 guests 필드에 추가
      item.addEventListener("click", () => addGuest(user.email));
      listContainer.appendChild(item);
    });

    // 리스트 표시
    listContainer.classList.remove("hidden");
  } catch (error) {
    console.error("Error loading following list:", error);
    alert("Failed to load following list.");
  }
}

// guests 필드에 이메일 추가
function addGuest(email) {
  const guestsField = document.getElementById("guests");
  const currentValue = guestsField.value;

  // 중복 추가 방지
  if (!currentValue.includes(email)) {
    guestsField.value = currentValue ? `${currentValue}, ${email}` : email;
  }

  // 리스트 숨기기
  document.getElementById("following-list").classList.add("hidden");
}
