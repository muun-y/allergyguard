const database = include("databaseConnection");

async function createNotification({
  sender_id,
  receiver_id,
  event_id,
  message,
}) {
  const query = `
    INSERT INTO notification (sender_id, receiver_id, event_id, message, status)
    VALUES (?, ?, ?, ?, 'pending');
  `;
  const [result] = await database.query(query, [
    sender_id,
    receiver_id,
    event_id,
    message,
  ]);
  return result.affectedRows > 0;
}

async function getNotificationCount(userId) {
  const query =
    "SELECT COUNT(*) AS count FROM notification WHERE receiver_id = ? AND status = 'pending'";
  const [rows] = await database.query(query, [userId]);
  return rows[0].count;
}

async function getNotificationsForUser(userId) {
  const query = `
        SELECT n.notification_id, n.sender_id, n.event_id, n.message, n.status, 
               e.title AS event_title, u.username AS sender_name
        FROM notification n
        LEFT JOIN user u ON n.sender_id = u.user_id
        LEFT JOIN event e ON n.event_id = e.event_id
        WHERE n.receiver_id = ? AND n.status = 'pending'
        ORDER BY n.notification_id DESC;
    `;
  const [rows] = await database.query(query, [userId]);
  return rows;
}

// Accept notification and create a new event for the receiver
async function acceptNotification(notificationId) {
  try {
    // Step 1: Retrieve notification details and the associated event
    const getNotificationQuery = `
      SELECT n.notification_id, n.sender_id, n.receiver_id, n.event_id,
             e.title, e.description, e.start_datetime, e.end_datetime, e.color
      FROM notification n
      INNER JOIN event e ON n.event_id = e.event_id
      WHERE n.notification_id = ?;
    `;
    const [rows] = await database.query(getNotificationQuery, [notificationId]);

    if (rows.length === 0) {
      throw new Error("Notification not found or invalid notification ID.");
    }

    const notification = rows[0];

    // Step 2: Update the notification status to 'accepted'
    const updateNotificationQuery = `
      UPDATE notification
      SET status = 'accepted'
      WHERE notification_id = ?;
    `;
    const [updateResult] = await database.query(updateNotificationQuery, [
      notificationId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw new Error("Failed to update notification status.");
    }

    // Step 3: Insert the event for the receiver
    const insertEventQuery = `
      INSERT INTO event (title, description, start_datetime, end_datetime, color, user_id)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const [insertResult] = await database.query(insertEventQuery, [
      notification.title,
      notification.description,
      notification.start_datetime,
      notification.end_datetime,
      notification.color,
      notification.receiver_id, // Add the event to the receiver's user_id
    ]);

    if (insertResult.affectedRows === 0) {
      throw new Error("Failed to insert event for receiver.");
    }

    return true;
  } catch (error) {
    console.error("Error accepting notification and creating event:", error);
    return false;
  }
}

async function declineNotification(notificationId) {
  const query = `
        UPDATE notification
        SET status = 'declined'
        WHERE notification_id = ?;
    `;
  const [result] = await database.query(query, [notificationId]);
  return result.affectedRows > 0;
}

module.exports = {
  createNotification,
  getNotificationCount,
  getNotificationsForUser,
  acceptNotification,
  declineNotification,
};
