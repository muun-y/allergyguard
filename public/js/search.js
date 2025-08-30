function handleSearch(query) {
  if (query === "" || query === "@") {
    clearSearchResults();
    return;
  }

  if (query.startsWith("@")) {
    const keyword = query.slice(1);
    if (keyword === "") {
      clearSearchResults();
      document.getElementById("user-search-title").style.display = "none";
      return;
    }
    fetch(`/search/users?keyword=${encodeURIComponent(keyword)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("user-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayUserResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });
  } else {
    // Thread
    fetch(`/search/threads?keyword=${encodeURIComponent(query)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("thread-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayThreadResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });

    // Comment
    fetch(`/search/comments?keyword=${encodeURIComponent(query)}`)
      .then((response) => {
        if (!response.ok) throw new Error("No search results found");
        return response.json();
      })
      .then((data) => {
        document.getElementById("comment-search-title").style.display = "block";
        if (data.length === 0) {
          clearSearchResults();
        } else {
          displayCommentResults(data);
        }
      })
      .catch((error) => {
        clearSearchResults();
      });
  }
}

function displayUserResults(users) {
  const resultsContainer = document.getElementById("user-search-results");
  const template = document.getElementById("user-template");

  // 이전 검색 결과 삭제
  resultsContainer.innerHTML = "";

  users.forEach((user) => {
    const userElement = template.content.cloneNode(true);

    // 프로필 이미지 설정
    const profileImg = userElement.querySelector(".profile-img");
    const placeholderImg = userElement.querySelector(".placeholder-img");
    if (user.profile_img) {
      profileImg.src = user.profile_img;
      profileImg.alt = user.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    // 사용자 정보 설정
    userElement.querySelector(".username").textContent = user.username;
    userElement.querySelector(".bio").textContent = user.bio || "";

    // 팔로워 수 표시
    const followerCountElement = userElement.querySelector(".followers-count");
    followerCountElement.textContent = `${user.followerCount || 0} followers`;

    // 팔로우/언팔로우 버튼 설정
    const followButton = userElement.querySelector(".follow-button");
    followButton.setAttribute("data-user-id", user.user_id);
    updateFollowButton(
      followButton,
      user.user_id,
      user.isFollowing,
      followerCountElement
    );

    // 결과 컨테이너에 추가
    resultsContainer.appendChild(userElement);
  });
}

function updateFollowButton(button, userId, isFollowing, followerCountElement) {
  button.textContent = isFollowing ? "Unfollow" : "Follow";
  button.disabled = false;

  // 기존 이벤트 리스너 제거
  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);

  // 새 이벤트 리스너 추가
  if (isFollowing) {
    newButton.addEventListener("click", () =>
      unfollowUser(userId, newButton, followerCountElement)
    );
  } else {
    newButton.addEventListener("click", () =>
      followUser(userId, newButton, followerCountElement)
    );
  }
}

function followUser(userId, button, followerCountElement) {
  button.disabled = true; // 중복 클릭 방지
  fetch("/follow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ following_id: userId }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to follow user.");
      return response.json();
    })
    .then((data) => {
      console.log(data.message);
      updateFollowButton(button, userId, true, followerCountElement);

      // 서버에서 받은 팔로워 수로 업데이트
      if (followerCountElement) {
        followerCountElement.textContent = `${data.followerCount} followers`;
      }
    })
    .catch((error) => {
      console.error("Error following user:", error);
      alert("An error occurred while following the user.");
    })
    .finally(() => {
      button.disabled = false; // 버튼 다시 활성화
    });
}

function unfollowUser(userId, button, followerCountElement) {
  button.disabled = true; // 중복 클릭 방지
  fetch("/unfollow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ following_id: userId }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to unfollow user.");
      return response.json();
    })
    .then((data) => {
      console.log(data.message);
      updateFollowButton(button, userId, false, followerCountElement);

      // 서버에서 받은 팔로워 수로 업데이트
      if (followerCountElement) {
        followerCountElement.textContent = `${data.followerCount} followers`;
      }
    })
    .catch((error) => {
      console.error("Error unfollowing user:", error);
      alert("An error occurred while unfollowing the user.");
    })
    .finally(() => {
      button.disabled = false; // 버튼 다시 활성화
    });
}

function displayThreadResults(threads) {
  const resultsContainer = document.getElementById("thread-search-results");
  const template = document.getElementById("thread-template");

  resultsContainer.innerHTML = "";

  threads.forEach((thread) => {
    const threadElement = template.content.cloneNode(true);

    const threadLink = threadElement.querySelector(".thread-link");
    threadLink.href = `/thread/${thread.thread_id}`;

    const profileImg = threadElement.querySelector(".profile-img");
    const placeholderImg = threadElement.querySelector(".placeholder-img");
    if (thread.profile_img) {
      console.log("profileImg.src:", profileImg.src);
      profileImg.src = thread.profile_img;
      profileImg.alt = thread.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    const createdAtDate = new Date(thread.created_at).toLocaleDateString();
    threadElement.querySelector(".username").innerHTML = `
  ${thread.username} <span class="ml-3 text-gray-300 created-at text-sm">${createdAtDate}</span>
`;
    threadElement.querySelector(".content").textContent = thread.content;

    const threadImageContainer = threadElement.querySelector(
      ".thread-image-container"
    );
    if (thread.image_url) {
      const threadImg = threadElement.querySelector(".thread-img");
      threadImg.src = thread.image_url;
      threadImageContainer.classList.remove("hidden");
    } else {
      threadImageContainer.classList.add("hidden");
    }

    threadElement.querySelector(".like-count").textContent =
      thread.like_count || 0;
    threadElement.querySelector(".comment-count").textContent =
      thread.comment_count || 0;

    resultsContainer.appendChild(threadElement);
  });
}

function displayCommentResults(comments) {
  const resultsContainer = document.getElementById("comment-search-results");
  const template = document.getElementById("comment-template");

  resultsContainer.innerHTML = ""; // 기존 검색 결과 삭제

  comments.forEach((comment) => {
    const commentElement = template.content.cloneNode(true);

    const profileImg = commentElement.querySelector(".profile-img");
    const placeholderImg = commentElement.querySelector(".placeholder-img");
    if (comment.profile_img) {
      profileImg.src = comment.profile_img;
      profileImg.alt = comment.username;
      placeholderImg.classList.add("hidden");
    } else {
      profileImg.classList.add("hidden");
      placeholderImg.classList.remove("hidden");
    }

    const createdAtDate = new Date(comment.created_at).toLocaleDateString();
    commentElement.querySelector(".username").innerHTML = `
      ${comment.username} <span class="ml-3 text-gray-300 created-at text-sm">${createdAtDate}</span>
    `;
    commentElement.querySelector(".content").textContent = comment.content;

    resultsContainer.appendChild(commentElement);
  });
}

function clearSearchResults() {
  const userResultsContainer = document.getElementById("user-search-results");
  userResultsContainer.innerHTML = "";
  document.getElementById("user-search-title").style.display = "none";

  const threadResultsContainer = document.getElementById(
    "thread-search-results"
  );
  threadResultsContainer.innerHTML = "";
  document.getElementById("thread-search-title").style.display = "none";

  const commentResultsContainer = document.getElementById(
    "comment-search-results"
  );
  commentResultsContainer.innerHTML = "";
  document.getElementById("comment-search-title").style.display = "none";
}
