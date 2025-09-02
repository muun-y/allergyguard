require("./utils");
require("dotenv").config();

const express = require("express");

// Session management
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Multer for file uploads
// const fs = require("fs");
// const uploadDir = path.join(__dirname, "/public/profile");

// Hash passwords using BCrypt
const bcrypt = require("bcrypt");
const saltRounds = 12;

// shorten url
const shortid = require("shortid");

//db connection
const database = include("databaseConnection");
const db_utils = include("database/db_utils");
const create_tables = include("database/create_tables");
const db_users = include("database/db_users");
// const db_follows = include("database/db_follows");
// const db_events = include("database/db_events");
// const db_notifications = include("database/db_notifications");
// const db_comments = include("database/db_comments");
// const success = db_utils.printMySQLVersion();

//reference of the express module
const app = express();

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
// const mongodb_url = process.env.MONGODB_URL;
// const mongodb_user = process.env.MONGODB_USER;
// const mongodb_password = process.env.MONGODB_PASSWORD;
// const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

const crypto = require("crypto");
const { v4: uuid } = require("uuid");
// const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const cloudinary = require("cloudinary");
// const e = require("express");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

// Multer setting
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// let mongoStore = MongoStore.create({
//   mongoUrl: `${mongodb_url}`,
//   crypto: {
//     secret: mongodb_session_secret,
//   },
// });

app.use(
  session({
    secret: node_session_secret,
    // store: mongoStore,
    saveUninitialized: false,
    resave: true,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 3600000, // 1 hour in milliseconds
    },
    autoRemove: "interval",
    autoRemoveInterval: 60, // Sessions older than 1 hour will be removed every minute
    encrypt: true, // Enable encryption for session data (this is usually the default)
  })
);

// Using middleware to pass session data to views
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.authenticated = req.session.authenticated || false;
  next();
});

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  if (!isValidSession(req)) {
    req.session.destroy();
    res.redirect("/login");
    return;
  } else {
    next();
  }
}

// Home
app.get("/", (req, res) => {
  const isAuthenticated = req.session.authenticated || false; // Check authentication
  res.render("index", { isAuthenticated });
});

// Sign up
app.get("/signup", (req, res) => {
  if (!isValidSession(req)) {
    res.render("signup");
  } else {
    res.redirect("/");
  }
});

// app.use("/createTables", sessionValidation);
// app.get("/createTables", async (req, res) => {
//   try {
//     let success = await create_tables.createTables(); // Ensure you're awaiting the async function

//     if (success) {
//       res.send("Created tables.");
//     } else {
//       res.send("Failed to create tables.");
//     }
//   } catch (err) {
//     console.error("Error in /createTables route", err);
//     res.status(500).send("An error occurred while creating tables.");
//   }
// });

// signingUp
app.post("/signingUp", upload.single("profile"), async (req, res) => {
  let email = req.body.email;
  let username = req.body.username;
  let password = req.body.password;
  let profile = req.file;

  console.log("profile", profile);
  console.log("username", username);
  console.log("email", email);
  console.log("password", password);

  // Input validation
  if (!email || !username || !password) {
    return res.status(500).send("Please fill in all required fields.");
  }

  // Password validation >= 10 characters with upper/lowercase, numbers, symbols
  const regexUpper = /[A-Z]/;
  const regexLower = /[a-z]/;
  const regexNumber = /[0-9]/;
  const regexSymbol = /[$&+,:;=?@#|'<>.^*()%!-]/;

  if (
    password.length >= 10 &&
    regexUpper.test(password) &&
    regexLower.test(password) &&
    regexNumber.test(password) &&
    regexSymbol.test(password)
  ) {
    try {
      // Check if username or email already exists
      const existingUser = await db_users.checkUserExist({
        email: email,
        username: username,
      });
      // db_users.findUserByEmailOrUsername 함수는 email이나 username으로 사용자 검색을 수행함

      if (existingUser) {
        // If user with the same email or username exists
        return res.status(400).send("Username or Email already exists.");
      }

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, saltRounds);

      let profileUrl = null;
      if (profile) {
        let image_uuid = uuid();
        let buf64 = req.file.buffer.toString("base64");

        try {
          // profile image upload to Cloudinary
          const result = await cloudinary.uploader.upload(
            "data:image/octet-stream;base64," + buf64,
            { folder: "user_profiles" }, // folder name
            { public_id: image_uuid } // file name
          );

          if (!result.secure_url) {
            return res.render("error", {
              message: "Error uploading the image to Cloudinary",
            });
          }

          profileUrl = result.secure_url; // URL to the uploaded image
        } catch (err) {
          console.error("Cloudinary upload error:", err);
          return res.status(500).send("Failed to upload profile image.");
        }
      }

      // Create new user if email and username are unique
      const success = await db_users.createUser({
        email,
        username,
        hashedPassword,
        profile: profileUrl, // URL to the uploaded image (or null)
      });

      if (success) {
        return res.status(200).send("Successfully created user.");
      } else {
        return res.status(500).send("Error creating the user.");
      }
    } catch (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error saving the user to the database.");
    }
  } else {
    // Password does not meet requirements
    return res
      .status(400)
      .send("Invalid password. Must meet complexity requirements.");
  }
});

// Login
app.get("/login", (req, res) => {
  if (!isValidSession(req)) {
    res.render("login");
  } else {
    res.redirect("/");
  }
});

// Logging in
app.post("/loggingin", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  try {
    let user = await db_users.getUser({
      username: username,
    });

    if (!user) {
      return res.status(404).send("Invalid username or password");
    }

    // there should only be 1 user in the db that matches
    if (bcrypt.compareSync(password, user.password_hash)) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.user_id = user.user_id;
      req.session.email = user.email;
      // req.session.profile_img = user.profile_img;
      req.session.cookie.maxAge = expireTime;
      return res.status(200).send("Login success");
    } else {
      return res.status(404).send("Invalid username or password");
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).send("Server error");
  }
});

// Log out
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//my allergy page
// app.use("/myAllergy", sessionValidation);
app.get("/myAllergy", async (req, res) => {
  const isAuthenticated = req.session.authenticated || false; // Check authentication
  res.render("myAllergy", { isAuthenticated });
});

//past and deleted events
// app.use("/pastEvent", sessionValidation);
// app.get("/pastEvent", async (req, res) => {
//   const isAuthenticated = req.session.authenticated || false; // Check authentication
//   res.render("past", { isAuthenticated });
// });

// app.get("/api/past", async (req, res) => {
//   const { tab, date } = req.query;

//   try {
//     if (!req.session || !req.session.user_id) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const userId = req.session.user_id;

//     const events = await db_events.getEventsByTab(tab, date, userId);

//     console.log(`Fetched events for tab: ${tab}, date: ${date}`, events);
//     res.json({ events });
//   } catch (error) {
//     console.error("Error fetching events:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch events.", error: error.message });
//   }
// });

//Profile
app.use("/profile", sessionValidation);
app.get("/profile", async (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const followersCount = await db_follows.getFollowersCount(userId); // 팔로워 수 가져오기
    res.render("profile", {
      username: req.session.username,
      email: req.session.email,
      profile_img: req.session.profile_img,
      followersCount: followersCount, // 팔로워 수 전달
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Failed to load profile");
  }
});

// Search
app.get("/search", (req, res) => {
  res.render("search", {
    users: [],
    username: req.session.username,
    email: req.session.email,
    profile_img: req.session.profile_img,
  });
});

app.get("/search/users", async (req, res) => {
  const keyword = req.query.keyword; // 검색어를 쿼리 파라미터에서 가져옴
  const userId = req.session.user_id;

  if (!keyword) {
    return res.status(400).send("Keyword is required.");
  }

  try {
    // DB에서 username이나 email이 검색어와 일치하는 사용자를 검색
    const users = await db_users.searchUsers(keyword); // searchUsers 함수를 별도로 정의해야 합니다.
    // 각 사용자에 대한 팔로우 상태 및 팔로워 수 추가
    const userWithFollowData = await Promise.all(
      users.map(async (user) => {
        const isFollowing = await db_follows.isFollowing(userId, user.user_id);
        const followerCount = await db_follows.getFollowersCount(user.user_id);
        return { ...user, isFollowing, followerCount };
      })
    );

    if (users.length === 0) {
      console.log("No users found matching the keyword");
      // return res.json([]);
      return res.status(204).json([]);
    }

    res.json(userWithFollowData);
  } catch (err) {
    console.log("Error searching for users:", err);
    res.status(500).send("Error searching for users");
  }
});

// Follow API
app.post("/follow", async (req, res) => {
  const follower_id = req.session.user_id;
  const { following_id } = req.body;

  if (!follower_id || !following_id) {
    return res.status(400).json({ error: "Invalid follower or following ID." });
  }

  try {
    const existingFollow = await db_follows.checkFollow({
      follower_id,
      following_id,
    });
    if (existingFollow) {
      return res.status(400).json({ message: "Already following this user." });
    }

    await db_follows.addFollow({ follower_id, following_id });

    // Get updated follower count
    const followerCount = await db_follows.getFollowersCount(following_id);

    res
      .status(200)
      .json({ message: "Successfully followed the user.", followerCount });
  } catch (err) {
    console.error("Error following user:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Unfollow API
app.post("/unfollow", async (req, res) => {
  const follower_id = req.session.user_id;
  const { following_id } = req.body;

  if (!follower_id || !following_id) {
    return res.status(400).json({ error: "Invalid follower or following ID." });
  }

  try {
    await db_follows.removeFollow({ follower_id, following_id });

    // Get updated follower count
    const followerCount = await db_follows.getFollowersCount(following_id);

    res
      .status(200)
      .json({ message: "Successfully unfollowed the user.", followerCount });
  } catch (err) {
    console.error("Error unfollowing user:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// app.get("/search/comments", async (req, res) => {
//   const keyword = req.query.keyword; // 검색어를 쿼리 파라미터에서 가져옴

//   if (!keyword) {
//     return res.status(400).send("검색어가 필요합니다.");
//   }

//   try {
//     // DB에서 content가 검색어와 일치하거나 포함된 comment 검색
//     const comments = await db_comments.getCommentsByKeyword(keyword); // searchComments 함수를 별도로 정의해야 합니다.

//     if (comments.length === 0) {
//       console.log("No comments found matching the keyword");
//       return res.status(204).json([]); // 검색 결과가 없을 때 빈 배열 반환
//     }

//     res.json(comments); // 검색된 댓글을 JSON 형식으로 반환
//   } catch (err) {
//     console.log("Error searching for comments:", err);
//     res.status(500).send("Error searching for comments");
//   }
// });

//create new event
// app.use("/create-event", sessionValidation);
// app.post("/create-event", async (req, res) => {
//   const { title, start_date, start_time, end_date, end_time, guests, color } =
//     req.body;
//   const user_id = req.session.user_id;

//   // 필수 필드 유효성 검사
//   if (!title || !start_date || !start_time || !end_date || !end_time) {
//     return res.status(400).send({
//       message:
//         "All required fields (title, start/end date, start/end time) must be filled.",
//     });
//   }

//   const start_datetime = new Date(`${start_date}T${start_time}`);
//   const end_datetime = new Date(`${end_date}T${end_time}`);

//   if (start_datetime >= end_datetime) {
//     return res.status(400).send({
//       message: "End date/time must be after start date/time.",
//     });
//   }

//   let guestsEmailList = [];
//   if (guests) {
//     guestsEmailList = guests.split(",").map((email) => email.trim());
//   }

//   const eventData = {
//     title,
//     start_datetime,
//     end_datetime,
//     color: color || "#FFFFFF",
//     user_id,
//   };

//   try {
//     const insertResult = await db_events.insertEvent(eventData);

//     if (!insertResult.success) {
//       throw new Error(insertResult.error || "Unknown error occurred.");
//     }

//     const eventId = insertResult.eventId;

//     if (guestsEmailList.length > 0) {
//       for (const guestEmail of guestsEmailList) {
//         try {
//           const guest = await db_users.getUserByEmail(guestEmail);
//           if (!guest) {
//             console.warn(`User with email ${guestEmail} not found.`);
//             continue;
//           }

//           const notificationData = {
//             sender_id: user_id,
//             receiver_id: guest.user_id,
//             event_id: eventId,
//             message: `You have been invited to the event: ${title}`,
//           };

//           await db_notifications.createNotification(notificationData);
//         } catch (err) {
//           console.error(`Error sending notification to ${guestEmail}:`, err);
//         }
//       }
//     }

//     res.redirect("/");
//   } catch (error) {
//     console.error("Error creating event:", error);
//     res
//       .status(500)
//       .send({ message: "Failed to create event.", error: error.message });
//   }
// });

// Route to get past events
// app.use("/pastEvent", sessionValidation);
// app.get("/pastEvent", async (req, res) => {
//   const isAuthenticated = req.session.authenticated || false; // Check authentication

//   // Render the pastEvent view with fetched data
//   res.render("pastEvent", { isAuthenticated });
// });

// app.get("/api/notifications/count", async (req, res) => {
//   const userId = req.session.user_id;

//   if (!userId) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     const count = await db_notifications.getNotificationCount(userId);
//     res.json({ count });
//   } catch (error) {
//     console.error("Error fetching notification count:", error);
//     res.status(500).json({ error: "Failed to fetch notification count." });
//   }
// });

// app.use("/notifications", sessionValidation);
// app.get("/notifications", async (req, res) => {
//   const isAuthenticated = req.session.authenticated || false; // Check authentication

//   // Render the pastEvent view with fetched data
//   res.render("notifications", { isAuthenticated });
// });

// app.get("/api/notifications", async (req, res) => {
//   const userId = req.session.user_id;

//   if (!userId) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     const notifications = await db_notifications.getNotificationsForUser(
//       userId
//     );
//     res.json({ notifications });
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     res.status(500).json({ error: "Failed to fetch notifications." });
//   }
// });

// app.post("/api/notifications/:notificationId/accept", async (req, res) => {
//   const notificationId = req.params.notificationId;

//   try {
//     const result = await db_notifications.acceptNotification(notificationId);
//     if (result) {
//       res.status(200).send({ message: "Invitation accepted" });
//     } else {
//       res.status(400).send({ message: "Failed to accept invitation" });
//     }
//   } catch (error) {
//     console.error("Error accepting invitation:", error);
//     res.status(500).send({ message: "Server error" });
//   }
// });

// app.post("/api/notifications/:notificationId/decline", async (req, res) => {
//   const notificationId = req.params.notificationId;

//   try {
//     const result = await db_notifications.declineNotification(notificationId);
//     if (result) {
//       res.status(200).send({ message: "Invitation declined" });
//     } else {
//       res.status(400).send({ message: "Failed to decline invitation" });
//     }
//   } catch (error) {
//     console.error("Error declining invitation:", error);
//     res.status(500).send({ message: "Server error" });
//   }
// });

// Serve static files
app.use(express.static(__dirname + "/public"));

//  Catch all other routes and 404s
app.get("*", (req, res) => {
  res.status(404);
  // res.send("Page not found - 404");
  res.render("404");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
