const database = include("databaseConnection");

async function createTables() {
  let createUserSQL = `
		user_id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      username VARCHAR(500) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      profile_img VARCHAR(255),
      PRIMARY KEY (user_id),
      UNIQUE INDEX unique_username (username ASC),
      UNIQUE INDEX unique_email (email ASC)
);
	`;

  try {
    const results = await database.query(createUserSQL);

    console.log("Successfully created tables");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error Creating tables");
    console.log(err);
    return false;
  }
}

//SQL query
// CREATE TABLE content (
//     content_id INT NOT NULL AUTO_INCREMENT,
//     user_id INT NOT NULL,  -- user_id 컬럼 추가
//     type ENUM('link', 'text', 'image') NOT NULL,
//     original_url VARCHAR(1000) NOT NULL,
//     short_url VARCHAR(255) NOT NULL,
//     hit INT UNSIGNED DEFAULT 0,
//     is_active BOOLEAN DEFAULT true,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     last_hit_at TIMESTAMP,
//     PRIMARY KEY (content_id),
//     FOREIGN KEY (user_id) REFERENCES user(user_id)
// );

async function createContentTable() {
  let createContentSQL = `
    content_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,  -- user_id 컬럼 추가
    type ENUM('link', 'text', 'image') NOT NULL,
    original_url VARCHAR(1000) NOT NULL,
    short_url VARCHAR(255) NOT NULL,
    hit INT UNSIGNED DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_hit_at TIMESTAMP,
    PRIMARY KEY (content_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id) 
);
   `;

  // FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE

  try {
    const results = await database.query(createContentSQL);

    console.log("Successfully created tables");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error Creating tables");
    console.log(err);
    return false;
  }
}

module.exports = { createTables, createContentTable };
