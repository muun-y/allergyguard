const database = include("databaseConnection");

async function getAllActiveThreads() {
  const getAllActiveThreadsSQL = `
    SELECT 
      t.thread_id, 
      t.content, 
      t.created_at, 
      t.hit_count, 
      thread_img.url AS image_url, 
      u.email, 
      u.username, 
      profile_img.url AS profile_img
    FROM 
      thread t
    JOIN 
      user u ON t.user_id = u.user_id
    LEFT JOIN 
      image profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
    LEFT JOIN 
      image thread_img ON t.image_id = thread_img.image_id
    WHERE 
      t.is_active = 1 
      AND u.is_active = 1;
  `;

  try {
    const [results] = await database.query(getAllActiveThreadsSQL);
    console.log("Successfully retrieved threads", results);

    return results;
  } catch (err) {
    console.log("Error retrieving threads", err);
    return [];
  }
}

async function getMyThreads(postData) {
  let getMyThreadsSQL = `
    SELECT 
      t.thread_id, 
      t.content, 
      t.created_at, 
      thread_img.url AS image_url, 
      u.email, 
      u.username, 
      profile_img.url AS profile_img
    FROM 
      thread t
    JOIN 
      user u ON t.user_id = u.user_id
    LEFT JOIN 
      image profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
    LEFT JOIN 
      image thread_img ON t.image_id = thread_img.image_id
    WHERE 
      t.user_id = :user_id;
  `;

  let params = {
    user_id: postData.user_id,
  };

  try {
    const [results] = await database.query(getMyThreadsSQL, params);
    console.log("Successfully retrieved my threads", results);

    return results;
  } catch (err) {
    console.log("Error retrieving my threads");
    console.log(err);
    return [];
  }
}

async function insertThread(postData) {
  const insertThreadSQL = `
    INSERT INTO thread (content, created_at, user_id)
    VALUES (:content, NOW(), :user_id);
  `;

  const insertImageSQL = `
    INSERT INTO image (url, type, uploaded_at, user_id)
    VALUES (:image_url, 'thread', NOW(), :user_id);
  `;

  const updateThreadImageSQL = `
    UPDATE thread 
    SET image_id = :image_id 
    WHERE thread_id = :thread_id;
  `;

  let threadParams = {
    content: postData.content,
    user_id: postData.user_id,
  };

  try {
    const [result] = await database.query(insertThreadSQL, threadParams);
    const threadId = result.insertId;

    if (postData.image_url) {
      const imageParams = {
        image_url: postData.image_url,
        user_id: postData.user_id,
      };
      const [imageResult] = await database.query(insertImageSQL, imageParams);
      const imageId = imageResult.insertId;

      const updateParams = {
        image_id: imageId,
        thread_id: threadId,
      };
      await database.query(updateThreadImageSQL, updateParams);
    }

    console.log("Successfully inserted thread and image");
    return true;
  } catch (err) {
    console.log("Error inserting thread and image");
    console.log(err);
    return false;
  }
}

async function getThreadById(postData) {
  const getThreadByIdSQL = `
    SELECT 
      t.thread_id, 
      t.content, 
      t.created_at, 
      t.hit_count, 
      thread_img.url AS image_url, 
      u.email, 
      u.username, 
      profile_img.url AS profile_img
    FROM 
      thread t
    JOIN 
      user u ON t.user_id = u.user_id
    LEFT JOIN 
      image profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
    LEFT JOIN 
      image thread_img ON t.image_id = thread_img.image_id
    WHERE 
      t.thread_id = :thread_id;
  `;

  const params = {
    thread_id: postData.thread_id,
  };

  try {
    console.log("Executing query with params:", params);
    const [results] = await database.query(getThreadByIdSQL, params);
    console.log("Successfully retrieved thread by ID:", results);

    // If the thread is found, return it; otherwise, return null
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error retrieving thread by ID:", error);
    throw error;
  }
}

async function searchThreads(keyword) {
  const formattedKeyword = keyword.includes(" ") ? `"${keyword}"` : keyword;

  const searchThreadSQL = `
    SELECT 
      t.thread_id, 
      t.content, 
      t.created_at, 
      thread_img.url AS image_url, 
      t.user_id, 
      u.username, 
      profile_img.url AS profile_img,
      (LENGTH(t.content) - LENGTH(REPLACE(t.content, ?, ''))) / LENGTH(?) AS frequency
    FROM 
      thread t
    JOIN 
      user u ON t.user_id = u.user_id
    LEFT JOIN 
      image profile_img ON u.user_id = profile_img.user_id AND profile_img.type = 'profile'
    LEFT JOIN 
      image thread_img ON t.image_id = thread_img.image_id
    WHERE 
      MATCH(t.content) AGAINST(? IN BOOLEAN MODE) 
      AND u.is_active = 1
    ORDER BY 
      frequency DESC;
  `;

  const params = [keyword, keyword, formattedKeyword];

  try {
    const [rows] = await database.query(searchThreadSQL, params);

    if (rows.length === 0) {
      console.log("No threads found matching the keyword");
      return [];
    }

    console.log("Threads found:", rows);
    return rows;
  } catch (err) {
    console.log("Error searching for threads:", err);
    return [];
  }
}

async function incrementHitCount(postData) {
  const incrementHitCountSQL = `
    UPDATE thread
    SET hit_count = hit_count + 1
    WHERE thread_id = :thread_id;
  `;

  const params = {
    thread_id: postData.thread_id,
  };

  try {
    console.log("Incrementing hit count for thread:", params);
    const result = await database.query(incrementHitCountSQL, params);
    console.log("Hit count incremented:", result);

    // Return true if any rows were modified, otherwise false
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error incrementing hit count:", error);
    throw error;
  }
}

async function updateThreadContent(threadId, content) {
  const query = `UPDATE thread SET content = ? WHERE thread_id = ?`;
  const [result] = await database.execute(query, [content, threadId]);
  return result;
}

// thread 삭제 함수
async function deleteThreadById(threadId) {
  const query = `DELETE FROM thread WHERE thread_id = ?`;
  const [result] = await database.execute(query, [threadId]);
  return result;
}

module.exports = {
  getAllActiveThreads,
  getMyThreads,
  insertThread,
  getThreadById,
  searchThreads,
  incrementHitCount,
  updateThreadContent,
  deleteThreadById,
};
