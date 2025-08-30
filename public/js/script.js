// JavaScript to dynamically update the textarea height based on content
document.addEventListener("DOMContentLoaded", () => {
  // Automatically adjust the height of textareas
  const textareas = document.querySelectorAll("textarea");

  textareas.forEach(function (textarea) {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
  });

  // Initialize FullCalendar
  const calendarEl = document.getElementById("calendar");

  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth", // Monthly view
      events: "/api/events", // Fetch events from this endpoint
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
    });

    calendar.render();
  }
});
