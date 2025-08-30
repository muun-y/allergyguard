// Fetch notification count from server
async function updateNotificationCount() {
  try {
    const response = await fetch("/api/notifications/count");
    if (response.ok) {
      const data = await response.json();
      const count = data.count;
      console.log("Notification count:", count);

      // Update notification count badge
      const notificationBadge = document.getElementById("notification-count");
      if (count > 0) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = "flex";
      } else {
        notificationBadge.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error fetching notification count:", error);
  }
}

// JavaScript to dynamically update the textarea height based on content
document.addEventListener("DOMContentLoaded", () => {
  updateNotificationCount();
});
