const database = include("databaseConnection");

async function createUser(postData) {
  let createUserSQL = `
		INSERT INTO user
		(email, username, password_hash, profile_img)
		VALUES
		(:email, :username, :hashedPassword, :profile);
	`;

  let params = {
    email: postData.email,
    username: postData.username,
    hashedPassword: postData.hashedPassword,
    profile: postData.profile,
  };

  try {
    const results = await database.query(createUserSQL, params);

    console.log("Successfully created user");
    // console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error inserting user");
    console.log(err);
    return false;
  }
}

async function getUsers(postData) {
  let getUsersSQL = `
		SELECT username, password_hash
		FROM user;
	`;

  try {
    const results = await database.query(getUsersSQL);

    console.log("Successfully retrieved users");
    // console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error getting users");
    console.log(err);
    return false;
  }
}

async function getUsersWithoutSelf(postData) {
  let getUsersWithoutSelfSQL = `
		SELECT user_id, username
		FROM user 
    WHERE username != :username;
	`;

  let params = {
    username: postData.username,
  };

  try {
    const results = await database.query(getUsersWithoutSelfSQL, params);

    console.log("Successfully retrieved users");
    // console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error getting users");
    console.log(err);
    return false;
  }
}

async function getUser(postData) {
  let getUserSQL = `
		SELECT user_id, username, profile_img, password_hash
    FROM user
		WHERE username = :username;
	`;

  let params = {
    username: postData.username,
  };

  try {
    const results = await database.query(getUserSQL, params);
    console.log("Successfully found user");
    // console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user");
    console.log(err);
    return false;
  }
}

async function getUsersNotInRoom(postData) {
  let getUsersNotInRoomSQL = `
		SELECT user.user_id, user.username
    FROM user
    WHERE user.username NOT IN (
        SELECT user.username
        FROM user
        JOIN room_user ON user.user_id = room_user.user_id
        JOIN room ON room_user.room_id = room.room_id
        WHERE room.room_id = :room_id
    );
	`;

  let params = {
    room_id: postData.room_id,
  };

  try {
    const results = await database.query(getUsersNotInRoomSQL, params);
    console.log("Successfully found users not in the room");
    // console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user not in the room");
    console.log(err);
    return false;
  }
}

async function getUserByUsername(postData) {
  let getUserByUsernameSQL = `
    SELECT user_id, username, profile_img, password_hash, email
    FROM user
    WHERE username = :username;
  `;

  let params = {
    username: postData.username,
  };

  try {
    const results = await database.query(getUserByUsernameSQL, params);
    // console.log("Successfully found user by username:", results[0]);

    if (results.length === 0) {
      console.log("No user found with that username.");
      return false;
    }

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
    console.log("Error trying to find user by username");
    console.log(err);
    return false;
  }
}

async function updateEmail(postData) {
  let updateEmailSQL = `
    UPDATE user
    SET email = :email
    WHERE username = :username;
  `;

  let params = {
    email: postData.email,
    username: postData.username,
  };

  try {
    const results = await database.query(updateEmailSQL, params);
    console.log("Successfully updated email");
    return true;
  } catch (err) {
    console.log("Error updating email");
    console.log(err);
    return false;
  }
}

async function updatePassword(postData) {
  let updatePasswordSQL = `
    UPDATE user
    SET password_hash = :password_hash
    WHERE username = :username;
  `;

  let params = {
    password_hash: postData.password_hash,
    username: postData.username,
  };

  try {
    const results = await database.query(updatePasswordSQL, params);
    console.log("Successfully updated password");
    return true;
  } catch (err) {
    console.log("Error updating password");
    console.log(err);
    return false;
  }
}

async function getUserByEmail(postData) {
  let getUserByEmailSQL = `
    SELECT user_id, username, profile_img, password_hash, email
    FROM user
    WHERE email = :email;
  `;

  let params = {
    email: postData.email,
  };

  try {
    const results = await database.query(getUserByEmailSQL, params);
    console.log("Successfully found user by email:", results[0]);

    if (results[0].length === 0) {
      console.log("No user found with that email.");
      return false;
    }

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
    console.log("Error trying to find user by email");
    console.log(err);
    return false;
  }
}

module.exports = {
  createUser,
  getUsers,
  getUser,
  getUsersWithoutSelf,
  getUsersNotInRoom,
  getUserByUsername,
  updateEmail,
  updatePassword,
  getUserByEmail,
};
