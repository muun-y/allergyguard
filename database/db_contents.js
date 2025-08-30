const database = include("databaseConnection");

async function insertLink(postData) {
  let insertLinkSQL = `
        INSERT INTO content
        (user_id, type, original_url, short_url, created_at)
        VALUES (:user_id, :type, :original_url, :short_url, NOW());
    `;

  // Params for the SQL query
  let params = {
    user_id: postData.user_id,
    type: postData.type,
    original_url: postData.original_url,
    short_url: postData.short_url,
  };

  try {
    const results = await database.query(insertLinkSQL, params);

    console.log("Successfully inserted link");

    return true;
  } catch (err) {
    console.log("Error inserting link");
    console.log(err);
    return false;
  }
}

async function insertImage(postData) {
  let insertImageSQL = `
        INSERT INTO content
        (user_id, type, original_url, short_url, created_at)
        VALUES (
        (SELECT user_id FROM user WHERE username = :username), :type, :original_url, :short_url, NOW());
    `;

  // Params for the SQL query
  let params = {
    username: postData.username,
    type: postData.type,
    original_url: postData.original_url,
    short_url: postData.short_url,
  };

  try {
    await database.query(insertImageSQL, params);

    console.log("Successfully inserted image");

    return true;
  } catch (err) {
    console.log("Error inserting image");
    console.log(err);
    return false;
  }
}

async function getContentsByTypeAndUser(postData) {
  let getContentsByTypeAndUserSQL = `
        SELECT content_id, user_id, type, original_url, short_url, hit, is_active, created_at, last_hit_at FROM content 
        WHERE type = :type and user_id = (SELECT user_id FROM user WHERE username = :username);
    `;

  let params = {
    username: postData.username,
    type: postData.type,
  };

  try {
    const results = await database.query(getContentsByTypeAndUserSQL, params);
    console.log("Successfully revoked contents by type and user");

    return results[0];
  } catch (err) {
    console.log("Error revoking contents by type and user");
    console.log(err);
    return false;
  }
}

async function getTextContentByUser(postData) {
  let getTextContentSQL = `
        SELECT c.content_id, c.user_id, c.type, c.original_url, c.short_url, c.hit, c.is_active, c.created_at, c.last_hit_at, tc.text
        FROM content c
        INNER JOIN text_content tc 
        ON c.content_id = tc.content_id
        WHERE c.type = :type AND c.user_id = (SELECT user_id FROM user WHERE username = :username);
    `;

  let params = {
    type: postData.type,
    username: postData.username,
    short_url: postData.short_url,
  };

  try {
    const results = await database.query(getTextContentSQL, params);
    console.log("Successfully fetched text content by user");

    return results[0];
  } catch (err) {
    console.log("Error fetching text content by user");
    console.log(err);
    return false;
  }
}

async function insertText(postData) {
  // First SQL query to insert into the content table
  let insertContentSQL = `
        INSERT INTO content
        (user_id, type, original_url, short_url, created_at)
        VALUES (:user_id, :type, :original_url, :short_url, NOW());
    `;

  // Parameters for the content table insert
  let params = {
    user_id: postData.user_id,
    type: postData.type,
    original_url: postData.original_url,
    short_url: postData.short_url,
  };

  // Second SQL query to insert into the text_content table
  let insertTextContentSQL = `
        INSERT INTO text_content
        (text, content_id)
        VALUES (:text, :content_id);
    `;

  try {
    // Start a transaction
    await database.query("BEGIN");

    // Insert into the content table and get the last inserted content_id
    const result = await database.query(insertContentSQL, params);
    const contentId = result[0].insertId; // Get the last inserted content_id (MySQL specific)
    console.log("result:", result);
    // Check if insertId is valid
    if (!contentId) {
      throw new Error("Failed to retrieve content_id after insertion.");
    }

    // Insert into the text_content table with the generated content_id
    const textContentParams = {
      text: postData.text,
      content_id: contentId,
    };
    await database.query(insertTextContentSQL, textContentParams);

    // Commit the transaction
    await database.query("COMMIT");

    console.log("Successfully inserted text into both tables");
    return true;
  } catch (err) {
    // Rollback in case of any error
    await database.query("ROLLBACK");

    console.log("Error inserting text into tables");
    console.log(err);
    return false;
  }
}

async function getContentByContentId(postData) {
  let getContentByContentIdSQL = `
        SELECT * FROM content WHERE content_id = ?; 
    `;

  let params = [postData.content_id];

  try {
    const [results] = await database.query(getContentByContentIdSQL, params);

    console.log("Successfully revoked a content by a content id");
    return results;
  } catch (err) {
    console.log("Error revoking a content by a content id");
    console.log(err);
    return false;
  }
}

async function getUploadedContentsByUserId(postData) {
  let getUploadedContentsByUserIdSQL = `
        SELECT * FROM content WHERE user_id = ?; 
    `;

  let params = [postData.user_id];

  try {
    const [results] = await database.query(
      getUploadedContentsByUserIdSQL,
      params
    );

    console.log("Successfully revoked a content by a user id");
    return results;
  } catch (err) {
    console.log("Error revoking a content by a user id");
    console.log(err);
    return false;
  }
}

async function getUploadedContents(postData) {
  let getUploadedContentsSQL = `
        SELECT c.*, tc.*
        FROM content c
        LEFT JOIN text_content tc
        ON c.content_id = tc.content_id
        WHERE c.is_active = 1;
    `;

  try {
    const [results] = await database.query(getUploadedContentsSQL);

    console.log("Successfully fetched uploaded contents");

    return results;
  } catch (err) {
    console.log("Error fetching uploaded contents");
    console.log(err);
    return false;
  }
}

async function getContentByShortUrl(postData) {
  let getContentByShortUrlSQL = `
        SELECT * FROM content WHERE short_url = ?;`;

  let params = [postData.short_url];

  try {
    const results = await database.query(getContentByShortUrlSQL, params);
    console.log("Successfully revoked a content by a short url");

    if (
      results.length > 0 &&
      Array.isArray(results[0]) &&
      results[0].length > 0
    ) {
      return results[0][0];
    } else {
      return results[0];
    }
  } catch (err) {
    console.log("Error revoking a content by a short url");
    console.log(err);
    return false;
  }
}

async function getTextContentByShortUrl(postData) {
  let getTextContentByShortUrlSQL = `
    SELECT c.*, tc.text
    FROM content c
    JOIN text_content tc
    ON c.content_id = tc.content_id
    WHERE short_url = :short_url;
  `;

  let params = { short_url: postData.short_url };

  try {
    const results = await database.query(getTextContentByShortUrlSQL, params);
    console.log("Successfully revoked a content and text by a short url");
    if (
      results.length > 0 &&
      Array.isArray(results[0]) &&
      results[0].length > 0
    ) {
      return results[0][0];
    } else {
      return results[0];
    }
  } catch (err) {
    console.log("Error revoking a content and text by a short url");
    console.log(err);
    return false;
  }
}

async function updateHit(postData) {
  let updateHitSQL = `
    UPDATE content 
    SET hit = hit + 1, last_hit_at = CURRENT_TIMESTAMP 
    WHERE short_url = ?;
    `;

  let params = [postData.short_url];

  try {
    await database.query(updateHitSQL, params);
    console.log("Success");

    return true;
  } catch (err) {
    console.log("Errorr");
    console.log(err);
    return false;
  }
}

async function updateContentStatus(postData) {
  const updateContentStatusSQL = `UPDATE content SET is_active = :is_active WHERE content_id = :content_id`;

  let params = {
    is_active: postData.is_active,
    content_id: postData.content_id,
  };

  try {
    await database.query(updateContentStatusSQL, params);
    console.log(
      "Status update successful for content_id:",
      postData.content_id
    );

    return true;
  } catch (err) {
    console.error(
      "Error updating content status for content_id:",
      postData.content_id
    );
    console.log(err.message);
    return false;
  }
}

async function searchText(postData) {
  let searchTextSQL = `
    SELECT c.*, tc.text
    FROM content c
    JOIN text_content tc
    ON c.content_id = tc.content_id
    WHERE text LIKE :text AND type = :type;
  `;

  let params = { text: `%${postData.text}%`, type: postData.type };

  try {
    const results = await database.query(searchTextSQL, params);
    console.log("Successfully revoked a content by a text");
    return results[0];
  } catch (err) {
    console.log("Error revoking a content by a text");
    console.log(err);
    return false;
  }
}

module.exports = {
  insertLink,
  insertImage,
  insertText,
  getContentsByTypeAndUser,
  getTextContentByUser,
  getContentByContentId,
  getUploadedContentsByUserId,
  getUploadedContents,
  getContentByShortUrl,
  getTextContentByShortUrl,
  updateHit,
  updateContentStatus,
  searchText,
};
