async function fetchNotifications() {
  try {
    const response = await fetch("/api/notifications");
    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    const { notifications } = await response.json();
    const notificationList = document.getElementById("notification-list");

    if (notifications.length === 0) {
      notificationList.innerHTML = `
                    <div class="text-gray-500 text-sm">No new notifications</div>
                `;
      return;
    }

    // Render notifications
    notificationList.innerHTML = notifications
      .map((notification) => {
        return `
                        <div class="border p-4 rounded-md shadow-sm bg-white">
                            <p class="text-gray-700 text-sm">${
                              notification.message
                            }</p>
                            <div class="text-sm text-gray-500 mt-2">
                                <span>Event: ${
                                  notification.event_title || "N/A"
                                }</span> | 
                                <span>From: ${
                                  notification.sender_name || "Unknown"
                                }</span>
                            </div>
                            <div class="mt-2 flex justify-end">
                                <button 
                                    class="text-blue-500 text-sm hover:underline" 
                                    onclick="acceptInvitation(${
                                      notification.notification_id
                                    })">Accept</button>
                                <button 
                                    class="text-red-500 text-sm hover:underline ml-4" 
                                    onclick="declineInvitation(${
                                      notification.notification_id
                                    })">Decline</button>
                            </div>
                        </div>
                    `;
      })
      .join("");
  } catch (error) {
    console.error("Error fetching notifications:", error);
  }
}

async function acceptInvitation(notificationId) {
  try {
    const response = await fetch(
      `/api/notifications/${notificationId}/accept`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      alert("Invitation accepted");
      fetchNotifications(); // Refresh notifications
    } else {
      alert("Failed to accept invitation");
    }
  } catch (error) {
    console.error("Error accepting invitation:", error);
  }
}

async function declineInvitation(notificationId) {
  try {
    const response = await fetch(
      `/api/notifications/${notificationId}/decline`,
      {
        method: "POST",
      }
    );

    if (response.ok) {
      alert("Invitation declined");
      fetchNotifications(); // Refresh notifications
    } else {
      alert("Failed to decline invitation");
    }
  } catch (error) {
    console.error("Error declining invitation:", error);
  }
}

// Fetch notifications on page load
document.addEventListener("DOMContentLoaded", fetchNotifications);
