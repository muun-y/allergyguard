const database = include("databaseConnection");

async function insertEvent(postData) {
  const insertEventSQL = `
    INSERT INTO event (title, start_datetime, end_datetime, color, user_id)
    VALUES (:title, :start_datetime, :end_datetime, :color, :user_id);
  `;

  console.log(postData);

  const eventParams = {
    title: postData.title,
    start_datetime: postData.start_datetime,
    end_datetime: postData.end_datetime,
    color: postData.color || "#FFFFFF", // default color if not provided
    user_id: postData.user_id,
  };

  try {
    const [result] = await database.query(insertEventSQL, eventParams);
    const eventId = result.insertId;

    console.log("Successfully inserted event with ID:", eventId);
    return {
      success: true,
      eventId: eventId,
    };
  } catch (err) {
    console.error("Error inserting event:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

// Fetch events based on the provided tab
async function getEventsByTab(tab, selectedDate, userId) {
  if (!userId) {
    throw new Error("User ID is required to fetch events.");
  }

  const today = new Date();
  let query = "";
  let queryParams = [];

  // Parse the selectedDate to use as the base date
  const baseDate = selectedDate ? new Date(selectedDate) : today;
  const startOfDay = new Date(baseDate.setHours(0, 0, 0, 0)); // 하루의 시작 시간
  const endOfDay = new Date(baseDate.setHours(23, 59, 59, 999)); // 하루의 끝 시간

  if (tab === "today") {
    // 오늘 날짜가 이벤트 범위(start_datetime ~ end_datetime)에 포함된 이벤트
    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = true AND start_datetime <= ? AND end_datetime >= ?
      ORDER BY start_datetime ASC`;
    queryParams = [userId, endOfDay, startOfDay];
  } else if (tab === "upcoming") {
    const nextDay = new Date(baseDate);
    nextDay.setDate(baseDate.getDate() + 1); // 다음 날로 설정
    const startOfNextDay = new Date(nextDay.setHours(0, 0, 0, 0));
    const endOfNextDay = new Date(nextDay.setHours(23, 59, 59, 999));
    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = true AND start_datetime >= ? AND start_datetime <= ?
      ORDER BY start_datetime ASC`;
    queryParams = [userId, startOfNextDay, endOfNextDay];
  } else if (tab === "week") {
    // Events within the week starting from the selected date
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // 월요일로 설정
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 해당 주 일요일

    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = true AND start_datetime >= ? AND start_datetime < ?
      ORDER BY start_datetime ASC`;
    queryParams = [userId, startOfWeek, endOfWeek];
  } else if (tab === "past") {
    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = true AND end_datetime < NOW()
      ORDER BY end_datetime DESC`;
    queryParams = [userId];
  } else if (tab === "deleted") {
    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = false
      ORDER BY end_datetime DESC`;
    queryParams = [userId];
  } else if (tab === "month") {
    const startOfMonth = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + 1,
      1
    );
    query = `
      SELECT * FROM event 
      WHERE user_id = ? AND is_active = true AND start_datetime >= ? AND start_datetime < ?
      ORDER BY start_datetime ASC`;
    queryParams = [userId, startOfMonth, endOfMonth];
  } else {
    query = `
      SELECT * FROM event 
      WHERE user_id = ?
      ORDER BY start_datetime ASC`;
    queryParams = [userId];
  }

  try {
    const [events] = await database.query(query, queryParams);
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

async function getEventsBetween(start, end) {
  const query = `
      SELECT * FROM event
      WHERE start_datetime >= ? AND start_datetime < ?
      ORDER BY start_datetime ASC
    `;

  try {
    const [events] = await database.query(query, [start, end]);
    return events;
  } catch (error) {
    console.error("Error querying events:", error);
    throw error;
  }
}

// Update `is_active` to false for a specific event
async function markEventInactive(eventId) {
  if (!eventId) {
    throw new Error("Event ID is required.");
  }

  const updateSQL = `
    UPDATE event
    SET is_active = false,
        deleted_at = CURRENT_TIMESTAMP() 
    WHERE event_id = ?
  `;

  try {
    const [result] = await database.query(updateSQL, [eventId]);
    console.log("Successfully marked event as inactive:", result);
    return {
      success: true,
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error("Error marking event as inactive:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function restoreEvent(eventId, isActive, deletedAt) {
  try {
    const query = `
      UPDATE event
      SET is_active = ?, deleted_at = ?
      WHERE event_id = ?;
    `;
    const [result] = await database.execute(query, [
      isActive,
      deletedAt,
      eventId,
    ]);

    if (result.affectedRows > 0) {
      return { success: true };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error("Error restoring event:", error);
    throw error;
  }
}

module.exports = {
  insertEvent,
  getEventsByTab,
  getEventsBetween,
  markEventInactive,
  restoreEvent,
};
