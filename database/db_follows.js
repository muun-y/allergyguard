const database = include("databaseConnection");

// Check if follow relationship exists
async function checkFollow({ follower_id, following_id }) {
  const [rows] = await database.query(
    `SELECT * FROM follow WHERE follower_id = ? AND following_id = ?`,
    [follower_id, following_id]
  );
  return rows.length > 0;
}

// Add follow relationship
async function addFollow({ follower_id, following_id }) {
  const [result] = await database.query(
    `INSERT INTO follow (follower_id, following_id) VALUES (?, ?)`,
    [follower_id, following_id]
  );
  return result.affectedRows > 0;
}

// Remove follow relationship
async function removeFollow({ follower_id, following_id }) {
  const [result] = await database.query(
    `DELETE FROM follow WHERE follower_id = ? AND following_id = ?`,
    [follower_id, following_id]
  );
  return result.affectedRows > 0;
}

async function isFollowing(follower_id, following_id) {
  const [rows] = await database.query(
    "SELECT * FROM follow WHERE follower_id = ? AND following_id = ?",
    [follower_id, following_id]
  );
  return rows.length > 0;
}

// database/db_follows.js
async function getFollowersCount(userId) {
  const query =
    "SELECT COUNT(*) AS followerCount FROM follow WHERE following_id = ?";
  const [rows] = await database.query(query, [userId]);
  return rows[0].followerCount;
}

// Get list of users a specific user is following
async function getFollowingList(userId) {
  const query = `
    SELECT u.user_id, u.username, u.email, u.profile_img
    FROM follow f
    JOIN user u ON f.following_id = u.user_id
    WHERE f.follower_id = ?;
  `;
  const [rows] = await database.query(query, [userId]);
  return rows;
}

// Get list of users following a specific user
async function getFollowerList(userId) {
  const query = `
    SELECT u.user_id, u.username, u.email, u.profile_img
    FROM follow f
    JOIN user u ON f.follower_id = u.user_id
    WHERE f.following_id = ?;
  `;
  const [rows] = await database.query(query, [userId]);
  return rows;
}

// Get follow relationship details
async function getFollowRelationship(follower_id, following_id) {
  const query = `
    SELECT * 
    FROM follow
    WHERE follower_id = ? AND following_id = ?;
  `;
  const [rows] = await database.query(query, [follower_id, following_id]);
  return rows[0] || null; // Return the relationship if it exists
}

module.exports = {
  checkFollow,
  addFollow,
  removeFollow,
  isFollowing,
  getFollowersCount,
  getFollowingList,
  getFollowerList,
  getFollowRelationship,
};
