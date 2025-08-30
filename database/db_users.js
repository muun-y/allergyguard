const database = include("databaseConnection");

// Create a new user
async function createUser(postData) {
  const createUserSQL = `
    INSERT INTO user (email, username, password_hash)
    VALUES (:email, :username, :hashedPassword);
  `;

  const createProfileImageSQL = `
    INSERT INTO image (url, uploaded_at, user_id)
    VALUES (:profile, NOW(), :userId);
  `;

  const userParams = {
    email: postData.email,
    username: postData.username,
    hashedPassword: postData.hashedPassword,
  };

  try {
    await database.query("BEGIN");

    const result = await database.query(createUserSQL, userParams);
    const userId = result[0].insertId;

    if (postData.profile) {
      const profileImageParams = {
        profile: postData.profile,
        userId: userId,
      };
      await database.query(createProfileImageSQL, profileImageParams);
    }

    await database.query("COMMIT");
    console.log("Successfully created user and profile image");
    return true;
  } catch (err) {
    await database.query("ROLLBACK");
    console.log("Error creating user and profile image:", err);
    return false;
  }
}

// Get a user
async function getUser(postData) {
  let getUserSQL = `
    SELECT u.user_id, u.username, i.url AS profile_img, u.password_hash
    FROM user u
    LEFT JOIN image i ON u.user_id = i.user_id
    WHERE u.username = :username AND u.is_active = 1;
  `;

  let params = {
    username: postData.username,
  };

  try {
    const [rows] = await database.query(getUserSQL, params);

    if (rows.length === 0) {
      console.log("User not found");
      return false;
    }

    return rows[0];
  } catch (err) {
    console.log("Error trying to find user");
    console.log(err);
    return false;
  }
}

// Get a user
async function checkUserExist(postData) {
  let getUserSQL = `
		SELECT * FROM user WHERE username =:username OR email =:email;
	`;

  let params = {
    username: postData.username,
    email: postData.email,
  };

  try {
    const [rows] = await database.query(getUserSQL, params);

    if (rows.length === 0) {
      console.log("User not found");
      return false;
    }

    return true;
  } catch (err) {
    console.log("Error trying to find user");
    console.log(err);
    return false;
  }
}

// Search for users by username or email
async function searchUsers(keyword) {
  console.log("Searching for users with keyword:", keyword);

  let searchUserSQL = `
    SELECT u.user_id, u.username, u.email, i.url AS profile_img
    FROM user u
    LEFT JOIN image i ON u.user_id = i.user_id
    WHERE u.username LIKE :keyword AND u.is_active = 1;
  `;

  let params = {
    keyword: `%${keyword}%`,
  };

  try {
    const [rows] = await database.query(searchUserSQL, params);

    if (rows.length === 0) {
      console.log("No users found matching the keyword");
      return [];
    }

    console.log("Users found:", rows);
    return rows;
  } catch (err) {
    console.log("Error searching for users");
    console.log(err);
    return [];
  }
}

async function getUserByEmail(email) {
  const query =
    "SELECT user_id, email, username, profile_img, bio FROM user WHERE email = ?";
  const [rows] = await database.query(query, [email]);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  createUser,
  getUser,
  checkUserExist,
  searchUsers,
  getUserByEmail,
};
