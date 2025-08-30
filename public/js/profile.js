function updateFollowersCount() {
  fetch("/api/followers/count")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch followers count");
      return response.json();
    })
    .then((data) => {
      const followersCountElement = document.querySelector(".followers-count");
      if (followersCountElement) {
        followersCountElement.textContent = `${data.count} followers`;
      }
    })
    .catch((error) => {
      console.error("Error updating followers count:", error);
    });
}

document.addEventListener("DOMContentLoaded", updateFollowersCount);
