document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-button");
  const tabContent = document.getElementById("tab-content");
  const selectedDateElement = document.getElementById("selected-date");
  const dateSelectorContainer = document.getElementById(
    "date-selector-container"
  );
  const prevDateButton = document.getElementById("prev-date");
  const nextDateButton = document.getElementById("next-date");
  const datesByTab = {
    today: new Date(),
    upcoming: new Date(),
    week: new Date(),
    month: new Date(),
  };

  let currentDate = new Date();
  let activeTab = "today";
  let calendar = null;

  // FullCalendar 초기화 함수
  function initializeFullCalendar(initialView) {
    if (calendar) {
      calendar.destroy();
    }

    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
      const calendarContainer = document.createElement("div");
      calendarContainer.id = "calendar";
      tabContent.innerHTML = "";
      tabContent.appendChild(calendarContainer);
    }

    calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
      initialView: initialView,
      headerToolbar: {
        left: "prev,next",
        center: "title",
        right: "today",
      },
      eventTimeFormat: {
        hour: "2-digit",
        minute: "2-digit",
        meridiem: "short",
      },
      events: async (fetchInfo, successCallback, failureCallback) => {
        try {
          const start = new Date(fetchInfo.start);
          const end = new Date(fetchInfo.end);
          // console.log(`Fetching events between ${start} and ${end}`);

          const events = await fetchTabEvents(activeTab, currentDate);
          // console.log("Fetched events for FullCalendar:", events);
          successCallback(events);
        } catch (error) {
          console.error("Error fetching events for FullCalendar:", error);
          failureCallback(error);
        }
      },
      contentHeight: "auto", //adjust the height of the calendar based on the content
    });

    calendar.render();
  }

  // Update the selected date based on the tab
  function updateSelectedDateForTab(tabName, date) {
    let displayDate = new Date(date);

    if (tabName === "upcoming") {
      displayDate.setDate(displayDate.getDate() + 1);
      const options = { year: "numeric", month: "short", day: "numeric" };
      selectedDateElement.textContent = displayDate.toLocaleDateString(
        "en-US",
        options
      ); // "YYYY-MM-DD" format
    } else if (tabName === "week") {
      const startOfWeek = new Date(displayDate);
      const endOfWeek = new Date(displayDate);
      const day = startOfWeek.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;

      startOfWeek.setDate(startOfWeek.getDate() + diffToMonday); // move to monday
      endOfWeek.setDate(startOfWeek.getDate() + 6); // end of the week

      const options = { month: "short", day: "numeric" };
      selectedDateElement.textContent = `${startOfWeek.toLocaleDateString(
        "en-US",
        options
      )} - ${endOfWeek.toLocaleDateString("en-US", options)}`; // "MMM DD - MMM DD" format
    } else if (tabName === "month") {
      const options = { year: "numeric", month: "long" };
      selectedDateElement.textContent = displayDate.toLocaleDateString(
        "en-US",
        options
      );
    } else {
      const options = { year: "numeric", month: "short", day: "numeric" };
      selectedDateElement.textContent = displayDate.toLocaleDateString(
        "en-US",
        options
      );
    }
  }

  // hide and show the date selector based on the tab
  function toggleDateSelector(tabName) {
    if (tabName === "week" || tabName === "month") {
      dateSelectorContainer.style.display = "none"; // hide
    } else {
      dateSelectorContainer.style.display = "flex"; // show
    }
  }

  // prev/next button click event
  prevDateButton.addEventListener("click", async () => {
    if (activeTab === "today" || activeTab === "upcoming") {
      datesByTab[activeTab].setDate(datesByTab[activeTab].getDate() - 1);
      currentDate = new Date(datesByTab[activeTab]);
      updateSelectedDateForTab(activeTab, datesByTab[activeTab]); // 날짜 표시 업데이트
      const events = await fetchTabEvents(activeTab, datesByTab[activeTab]);
      loadTabContent(activeTab, datesByTab[activeTab], events); // 콘텐츠 갱신
    }
  });

  nextDateButton.addEventListener("click", async () => {
    if (activeTab === "today" || activeTab === "upcoming") {
      datesByTab[activeTab].setDate(datesByTab[activeTab].getDate() + 1);
      updateSelectedDateForTab(activeTab, datesByTab[activeTab]); // 날짜 표시 업데이트
      const events = await fetchTabEvents(activeTab, datesByTab[activeTab]);
      loadTabContent(activeTab, datesByTab[activeTab], events); // 콘텐츠 갱신
    }
  });

  // tab click event
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const tabName = tab.getAttribute("data-tab");
      activeTab = tabName;

      // update the tab styles
      tabs.forEach((t) => t.classList.remove("bg-gray-300", "text-blue-500"));
      tab.classList.add("bg-gray-300", "text-blue-500");
      toggleDateSelector(tabName);

      // initialize the date based on the tab
      if (tabName === "today") {
        datesByTab[tabName] = new Date();
      } else if (tabName === "upcoming") {
        if (!datesByTab[tabName]) {
          const today = new Date();
          today.setDate(today.getDate() + 1);
          datesByTab[tabName] = today;
        }
      }

      // render the content based on the tab
      if (tabName === "month") {
        initializeFullCalendar("dayGridMonth");
      } else if (tabName === "week") {
        initializeFullCalendar("timeGridWeek");
      } else if (tabName === "upcoming" || tabName === "today") {
        const events = await fetchTabEvents(tabName, currentDate);
        loadTabContent(tabName, currentDate, events); // 기존 로직 유지
      }

      // 선택한 날짜 표시
      updateSelectedDateForTab(tabName, currentDate);
    });
  });

  function formatDateToLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // function to get the event data from the server
  async function fetchTabEvents(tabName, date) {
    try {
      const formattedDate = formatDateToLocal(date);

      const response = await fetch(
        `/api/events?tab=${tabName}&date=${formattedDate}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      return data.events.map((event) => ({
        title: event.title,
        start: event.start_datetime,
        end: event.end_datetime,
        color: event.color || "#3a87ad",
        id: event.event_id,
      }));
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  }

  // render the "today" and "upcoming" tabs
  function loadTabContent(tabName, date, events) {
    tabContent.innerHTML = "";
    if (!events || !Array.isArray(events)) {
      events = [];
    }

    // console.log("Events to render in loadTabContent:", events);
    tabContent.innerHTML = events.length
      ? events
          .map((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
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
            return `
        <div class="tab-content">
          <div class="event-box" data-event-id="${event.id}">
            <!-- delete button -->
            <div class="text-right">
              <button class="delete-button text-gray-500 hover:text-red-600"
                      aria-label="Delete event">
                &times;
              </button>
            </div>
            <h2 class="event-title">${event.title}</h2>
            <p class="event-time">${formattedStart} ~ ${formattedEnd}</p>
          </div>
        </div>`;
          })
          .join("")
      : '<p class="text-center text-gray-500">No events available.</p>';

    // delete button click event
    document.querySelectorAll(".delete-button").forEach((deleteButton) => {
      deleteButton.addEventListener("click", async (e) => {
        const eventBox = e.target.closest(".event-box");
        const eventId = eventBox.getAttribute("data-event-id");
        if (!eventId) {
          alert("Event ID not found. Cannot delete event.");
          return;
        }

        const confirmed = confirm(
          "Are you sure you want to delete this event?"
        );
        if (confirmed && eventId) {
          try {
            // send a request to delete the event
            const response = await fetch(`/api/events/${eventId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ is_active: false }),
            });

            if (response.ok) {
              alert("Event successfully marked as inactive.");
              eventBox.remove(); // remove the event box from the UI
            } else {
              const errorData = await response.json();
              console.error("Failed to update event:", errorData);
              alert("Failed to delete the event. Please try again.");
            }
          } catch (error) {
            console.error("Error updating event:", error);
            alert("An error occurred. Please try again.");
          }
        }
      });
    });
  }

  // set the initial tab
  async function setInitialTab() {
    tabs.forEach((tab) => {
      if (tab.getAttribute("data-tab") === activeTab) {
        tab.classList.add("bg-gray-300", "text-blue-500");
      } else {
        tab.classList.remove("bg-gray-300", "text-blue-500");
      }
    });

    // Date Selector toggle
    toggleDateSelector(activeTab);

    if (activeTab === "month") {
      initializeFullCalendar("dayGridMonth");
    } else if (activeTab === "week") {
      initializeFullCalendar("timeGridWeek");
    } else {
      const events = await fetchTabEvents(activeTab, currentDate);
      loadTabContent(activeTab, currentDate, events);
    }

    updateSelectedDateForTab(activeTab, currentDate);
  }

  setInitialTab();
});
