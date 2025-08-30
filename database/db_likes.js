const database = include("databaseConnection");

// Find a like
async function findLike(postData) {
  let findLikeSQL = `
    SELECT * FROM \`like\` 
    WHERE (thread_id = :thread_id OR :thread_id IS NULL)
    AND (comment_id = :comment_id OR :comment_id IS NULL)
    AND user_id = :user_id
  `;

  let params = {
    user_id: postData.user_id,
    thread_id: postData.thread_id,
    comment_id: postData.comment_id,
  };

  try {
    const result = await database.query(findLikeSQL, params);
    console.log("Successfully found like");
    return result[0];
  } catch (err) {
    console.log("Error finding like");
    console.log(err);
    return false;
  }
}

// Find likes by thread id
async function getLikesForThreads(postData) {
  if (postData.threadIds.length === 0) {
    return [];
  }

  let getLikesForThreadsSQL = `
    SELECT 
      thread_id, 
      COUNT(*) AS like_count
    FROM \`like\`
    WHERE thread_id IN (?) 
    GROUP BY thread_id;
  `;

  try {
    // postData.threadIds
    const [likeCounts] = await database.query(getLikesForThreadsSQL, [
      postData.threadIds,
    ]);
    return likeCounts;
  } catch (err) {
    console.log("Error retrieving like counts for threads", err);
    return [];
  }
}

// Find likes by comment id
async function getLikesForComments(postData) {
  if (!postData.commentIds.length) {
    return [];
  }

  let getLikesForCommentsSQL = `
    SELECT 
      comment_id, 
      COUNT(*) AS like_count
    FROM \`like\`
    WHERE comment_id IN (?) 
    GROUP BY comment_id;
  `;

  try {
    const [likeCounts] = await database.query(getLikesForCommentsSQL, [
      postData.commentIds,
    ]);
    return likeCounts;
  } catch (err) {
    console.log("Error retrieving like counts for comments", err);
    return [];
  }
}

async function getUserLikesForThreads(postData) {
  if (!postData.threadIds.length) {
    // 빈 배열일 경우 빈 결과 반환
    return [];
  }

  let getLikesByUserSQL = `
    SELECT 
      thread_id, 
      COUNT(*) AS is_liked_by_user
    FROM \`like\`
    WHERE thread_id IN (?) 
    AND user_id = ?
    GROUP BY thread_id;
  `;

  try {
    const [userLikes] = await database.query(getLikesByUserSQL, [
      postData.threadIds,
      postData.user_id,
    ]);
    return userLikes;
  } catch (err) {
    console.log("Error retrieving user likes for threads", err);
    return [];
  }
}

async function getUserLikesForComments(postData) {
  if (!postData.commentIds || postData.commentIds.length === 0) {
    return [];
  }
  let getLikesByUserSQL = `
    SELECT 
      comment_id, 
      COUNT(*) AS is_liked_by_user
    FROM \`like\`
    WHERE comment_id IN (?) 
    AND user_id = ?
    GROUP BY comment_id;
  `;

  try {
    const [userLikes] = await database.query(getLikesByUserSQL, [
      postData.commentIds,
      postData.user_id,
    ]);
    return userLikes;
  } catch (err) {
    console.log("Error retrieving user likes for threads", err);
    return [];
  }
}

// Add a like
async function addLike(postData) {
  let addLikeSQL = `
    INSERT INTO \`like\` (created_at, user_id, thread_id, comment_id) 
    VALUES (NOW(), :user_id, :thread_id, :comment_id)
  `;

  let params = {
    user_id: postData.user_id,
    thread_id: postData.thread_id || null,
    comment_id: postData.comment_id || null,
  };

  try {
    await database.query(addLikeSQL, params);
    console.log("Successfully added like");
    return true;
  } catch (err) {
    console.log("Error adding like");
    console.log(err);
    return false;
  }
}

// Remove a like
async function removeLike(postData) {
  let removeLikeSQL = `
    DELETE FROM \`like\`
    WHERE user_id = :user_id 
    AND (thread_id = :thread_id OR :thread_id IS NULL)
    AND (comment_id = :comment_id OR :comment_id IS NULL)
  `;

  let params = {
    user_id: postData.user_id,
    thread_id: postData.thread_id || null,
    comment_id: postData.comment_id || null,
  };

  try {
    await database.query(removeLikeSQL, params);
    console.log("Successfully removed like");
    return true;
  } catch (err) {
    console.log("Error removing like");
    console.log(err);
    return false;
  }
}

module.exports = {
  findLike,
  getLikesForThreads,
  getUserLikesForThreads,
  getUserLikesForComments,
  getLikesForComments,
  addLike,
  removeLike,
};
