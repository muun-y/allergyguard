const database = include("databaseConnection");

async function getDepth(postData) {
  const query = `
    SELECT depth FROM comment WHERE comment_id = :comment_id
  `;

  const params = { comment_id: postData.comment_id };

  try {
    const [rows] = await database.query(query, params);

    console.log("Successfully get depth of a comment");
    if (rows[0]) {
      const depth = Number(rows[0].depth); // 숫자형으로 변환
      console.log("depth:", depth);
      return depth;
    } else {
      return 0; // 부모 댓글이 없을 경우 기본 depth 값으로 0 반환
    }
  } catch (err) {
    console.log("Error getting depth of a comment");
    console.error(err);
    return 0;
  }
}

async function insertComment(postData) {
  let insertCommentSQL = `
        INSERT INTO comment (content, thread_id, user_id, parent_comment_id, depth)
        VALUES (:content, :thread_id, :user_id, :parent_comment_id, :depth)
      
    `;

  // Params for the SQL query
  let params = {
    content: postData.content,
    thread_id: postData.thread_id,
    parent_comment_id: postData.parent_comment_id,
    user_id: postData.user_id,
    depth: postData.depth,
  };

  try {
    await database.query(insertCommentSQL, params);

    console.log("Successfully inserted comment");

    return true;
  } catch (err) {
    console.log("Error inserting comment");
    console.log(err);
    return false;
  }
}

//delete comment by comment id
async function deleteCommentById(postData) {
  const deleteCommentSQL = `DELETE FROM comment WHERE comment_id = :comment_id`;

  const params = { comment_id: postData.comment_id };

  // console.log("Attempting to delete comment with ID:", postData.comment_id);

  try {
    const [result] = await database.query(deleteCommentSQL, params);
    // console.log("Delete result:", result);
    // console.log("Comment deleted:", postData.comment_id);
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

//update comment by comment id
async function updateCommentById(postData) {
  const updateCommentSQL = `UPDATE comment SET content = :content WHERE comment_id = :comment_id`;

  const params = {
    comment_id: postData.comment_id,
    content: postData.content,
  };

  console.log("Attempting to update comment with ID:", postData.comment_id);

  try {
    const [result] = await database.query(updateCommentSQL, params);
    console.log("Update result:", result);
    console.log("Comment updated:", postData.comment_id);
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

// Find comments by thread id
async function getCommentsForThreads(postData) {
  if (postData.threadIds.length === 0) {
    return [];
  }

  let getLikesForThreadsSQL = `
    SELECT 
      thread_id, 
      COUNT(*) AS comment_count
    FROM comment
    WHERE thread_id IN (?) 
    GROUP BY thread_id;
  `;

  try {
    // postData.threadIds
    const [commentCounts] = await database.query(getLikesForThreadsSQL, [
      postData.threadIds,
    ]);
    return commentCounts;
  } catch (err) {
    console.log("Error retrieving comment counts for threads", err);
    return [];
  }
}

async function getCommentsByThreadId(postData) {
  try {
    const query = `
      SELECT c.comment_id, c.content, c.created_at, c.user_id, u.username, profile_img.url AS profile_img, c.parent_comment_id, c.depth
      FROM comment AS c
      JOIN user AS u ON c.user_id = u.user_id
      LEFT JOIN image AS profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
      WHERE c.thread_id = ?
      ORDER BY c.created_at ASC
    `;

    const [rows] = await database.execute(query, [postData.thread_id]);

    return rows;
  } catch (error) {
    console.error("Error retrieving comments by thread ID:", error);
    throw error;
  }
}

async function getCommentById(postData) {
  try {
    const query = `
      SELECT 
        c.comment_id, 
        c.content, 
        c.created_at, 
        c.user_id, 
        u.username, 
        profile_img.url AS profile_img,  -- Fetch profile image from image table
        c.parent_comment_id, 
        c.thread_id,
        c.depth
      FROM comment AS c
      JOIN user AS u ON c.user_id = u.user_id
      LEFT JOIN image AS profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
      WHERE c.comment_id = ?
    `;

    const [rows] = await database.execute(query, [postData.comment_id]);
    if (rows[0]) {
      rows[0].depth = Number(rows[0].depth); // Ensure depth is a number if necessary
    }

    return rows[0] || null; // Return the single comment or null if not found
  } catch (error) {
    console.error("Error retrieving comment by ID:", error);
    throw error;
  }
}

async function searchComments(keyword) {
  console.log("Searching for comments with keyword:", keyword);

  const searchCommentSQL = `
    SELECT 
      comment_id,
      content,
      created_at,
      user_id,
      (LENGTH(content) - LENGTH(REPLACE(content, ? , ''))) / LENGTH(?) AS frequency
    FROM 
      comment
    WHERE 
      MATCH(content) AGAINST(? IN BOOLEAN MODE)
    ORDER BY 
      frequency DESC;
  `;

  const params = [keyword, keyword, keyword];

  try {
    const [rows] = await database.query(searchCommentSQL, params);

    if (rows.length === 0) {
      console.log("No comments found matching the keyword");
      return [];
    }

    console.log("Comments found:", rows);
    return rows;
  } catch (err) {
    console.error("Error searching for comments:", err);
    return [];
  }
}

async function getCommentsByKeyword(keyword) {
  const query = `
    SELECT 
        comment.comment_id, 
        comment.content, 
        comment.depth, 
        comment.thread_id, 
        comment.user_id, 
        comment.created_at, 
        user.username,
        image.url AS profile_img,
        (MATCH(comment.content) AGAINST(:keyword IN BOOLEAN MODE)) AS relevance 
    FROM 
        comment
    JOIN 
        user ON comment.user_id = user.user_id
    LEFT JOIN 
        image ON user.user_id = image.user_id AND image.type = 'profile'
    WHERE 
        MATCH(comment.content) AGAINST(:keyword IN BOOLEAN MODE)
        AND comment.is_deleted = FALSE 
        AND user.is_active = TRUE  
    ORDER BY 
        relevance DESC,
        comment.depth ASC,   
        comment.created_at DESC;   
  `;

  const params = { keyword };

  try {
    const [rows] = await database.query(query, params);

    console.log("Successfully retrieved comments by keyword");
    if (rows.length > 0) {
      return rows.map((row) => ({
        comment_id: row.comment_id,
        content: row.content,
        depth: Number(row.depth),
        thread_id: row.thread_id,
        user_id: row.user_id,
        created_at: row.created_at,
        username: row.username,
        profile_img: row.profile_img,
        relevance: row.relevance,
      }));
    } else {
      console.log("No comments found for the keyword");
      return [];
    }
  } catch (err) {
    console.log("Error retrieving comments by keyword");
    console.error(err);
    return [];
  }
}

// Find comments by user_id, including username from user table
async function getUserComments(postData) {
  if (!postData.user_id) {
    return [];
  }

  const getUserCommentsSQL = `
    SELECT 
      comment.comment_id, 
      comment.thread_id, 
      comment.content, 
      comment.created_at, 
      user.username
    FROM comment
    JOIN user ON comment.user_id = user.user_id
    WHERE comment.user_id = ? 
    ORDER BY comment.created_at DESC;
  `;

  try {
    const [userComments] = await database.query(getUserCommentsSQL, [
      postData.user_id,
    ]);
    return userComments;
  } catch (err) {
    console.log("Error retrieving comments for user", err);
    return [];
  }
}

module.exports = {
  getDepth,
  insertComment,
  getCommentsForThreads,
  getCommentsByThreadId,
  deleteCommentById,
  getCommentById,
  updateCommentById,
  searchComments,
  getCommentsByKeyword,
  getUserComments,
};
