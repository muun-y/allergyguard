document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-buttons");
  const tabContent = document.getElementById("tab-content");
  let activeTab = "past"; // set the initial active tab to "past"
  let currentDate = new Date();

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const tabName = tab.getAttribute("data-tabs");
      activeTab = tabName;
      tabs.forEach((t) => t.classList.remove("bg-gray-300", "text-blue-500"));
      tab.classList.add("bg-gray-300", "text-blue-500");

      // get the event data from the server
      const events = await fetchTabPastEvents(activeTab, currentDate);

      // update the tab content
      loadTabPastContent(activeTab, events);
    });
  });

  function formatDateToLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // fetch event data from the server
  async function fetchTabPastEvents(tabName, date) {
    try {
      // change the date format to "YYYY-MM-DD"
      const formattedDate = formatDateToLocal(date);
      const response = await fetch(
        `/api/past?tab=${tabName}&date=${formattedDate}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();

      // return the event data
      return data.events.map((event) => ({
        title: event.title,
        start: event.start_datetime,
        end: event.end_datetime,
        color: event.color || "#3a87ad",
        delete_at: event.deleted_at,
        id: event.event_id,
        is_active: event.is_active,
      }));
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  }

  // load the tab content
  function loadTabPastContent(tabName, events) {
    tabContent.innerHTML = ""; // 기존 내용을 초기화

    if (!events || !Array.isArray(events)) {
      events = [];
    }

    tabContent.innerHTML = events.length
      ? events
          .map((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const deleteDate = new Date(event.delete_at);

            const permanentDeletionDate = new Date(
              deleteDate.setDate(deleteDate.getDate() + 30)
            );
            const today = new Date();
            const daysRemaining = Math.ceil(
              (permanentDeletionDate - today) / (1000 * 60 * 60 * 24)
            );

            const formattedStart = eventStart.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const formattedEnd = eventEnd.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const formattedDeleteDate = deleteDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return `
            <div class="tab-content">
              <div class="event-box border p-4 rounded shadow" data-event-id="${
                event.id
              }">
                <h2 class="event-title font-bold text-lg">${event.title}</h2>
                <p class="event-time text-gray-500">${formattedStart} ~ ${formattedEnd}</p>
                ${
                  activeTab === "deleted"
                    ? `
                            <p class="event-deleted-at text-red-500">
                                Deleted at: ${formattedDeleteDate}
                            </p>
                            <p class="event-deletion-countdown text-gray-500 text-sm">
                                ${
                                  daysRemaining > 0
                                    ? `(Permanently deleted in ${daysRemaining} day${
                                        daysRemaining !== 1 ? "s" : ""
                                      })`
                                    : "Ready for permanent deletion"
                                }
                            </p>
                           <i class="fas fa-arrow-left text-blue-500 cursor-pointer hover:text-blue-700 transition-colors duration-200"></i>
          `
                    : ""
                }
                </div>
            </div>`;
          })
          .join("")
      : '<p class="text-center text-gray-500">No events available.</p>';
    document.querySelectorAll(".fa-arrow-left").forEach((goBackButton) => {
      goBackButton.addEventListener("click", async (e) => {
        const eventBox = e.target.closest(".event-box");
        const eventId = eventBox.getAttribute("data-event-id");

        if (!eventId) {
          alert("Event ID not found. Cannot restore event.");
          return;
        }

        const confirmed = confirm(
          "Are you sure you want to restore this event?"
        );
        if (confirmed) {
          try {
            // send a request to restore the event
            const response = await fetch(`/api/restore/${eventId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ is_active: true, deleted_at: null }),
            });

            if (response.ok) {
              alert("Event successfully restored.");
              // delete the eventBox from the DOM
              eventBox.remove();
            } else {
              const errorData = await response.json();
              console.error("Failed to restore event:", errorData);
              alert("Failed to restore the event. Please try again.");
            }
          } catch (error) {
            console.error("Error restoring event:", error);
            alert("An error occurred. Please try again.");
          }
        }
      });
    });
  }

  // set the initial tab
  async function setInitialTab() {
    tabs.forEach((tab) => {
      if (tab.getAttribute("data-tabs") === activeTab) {
        tab.classList.add("bg-gray-300", "text-blue-500");
      } else {
        tab.classList.remove("bg-gray-300", "text-blue-500");
      }
    });
    const events = await fetchTabPastEvents(activeTab, currentDate);
    loadTabPastContent(activeTab, events);
  }

  setInitialTab();
});
