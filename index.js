require("./utils");
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const port = process.env.PORT || 3000;
const { v4: uuid } = require("uuid");
const multer = require("multer");
const cloudinary = require("cloudinary");

// Session management
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Multer for file uploads
// const fs = require("fs");
// const uploadDir = path.join(__dirname, "/public/profile");

//reference of the express module
const app = express();

//firestore instance
const db = admin.firestore();

/* Express setup */
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

// Multer setting
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* Middleware: Firebase Auth protect */
// async function checkAuth(req, res, next) {
//   const token = req.cookies.session;
//   if (!token) return res.redirect("/login");

//   try {
//     const decoded = await admin.auth().verifySessionCookie(token, true);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error("Auth error:", err);
//     return res.redirect("/login");
//   }
// }

app.use(async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) {
    // console.log("No session cookie in request");
    req.user = null;
    res.locals.user = null;
    return next();
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(token, true);
    // console.log("✅ Session verified:", decoded.uid, decoded.email);
    req.user = decoded;
    res.locals.user = decoded;
  } catch (err) {
    console.error("Session verify failed:", err.message);
    req.user = null;
    res.locals.user = null;
  }
  next();
});

app.post("/sessionLogin", async (req, res) => {
  const idToken = req.body.token;
  try {
    const expiresIn = 60 * 60 * 24 * 1000; // 1 day
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });

    res.cookie("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: false, // developing -> false, production -> true
      sameSite: "lax",
    });
    res.status(200).send("Login successful");
  } catch (error) {
    console.error("Session login failed:", error.message);
    res.status(401).send("Unauthorized");
  }
});

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

/* routes */
// Home
app.get("/", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.render("index", { user: null, allergies: [] });
  }

  // get the data users
  const userDoc = await db.collection("users").doc(req.user.uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  //get the user allergy list
  const allergiesSnap = await db
    .collection("users")
    .doc(req.user.uid)
    .collection("allergies")
    .get();

  const allergies = allergiesSnap.docs.map((doc) => doc.data());

  res.render("index", {
    user: {
      email: req.user.email,
      username: userData.username || req.user.email.split("@")[0],
    },
    allergies,
  });
});

// Sign up
app.get("/signup", (req, res) => {
  if (!res.locals.user) {
    // logged in
    res.render("signup");
  } else {
    // not logged in
    res.redirect("/");
  }
});

// Login
app.get("/login", (req, res) => {
  if (!res.locals.user) {
    // Not logged in
    res.render("login");
  } else {
    // logged in
    res.redirect("/");
  }
});

// Log out
app.get("/logout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});

app.get("/api/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    username: req.user.name || req.user.email.split("@")[0],
  });
});

//my allergy page
app.get("/myAllergy", requireAuth, async (req, res) => {
  try {
    // get data from the firebase db
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    res.render("myAllergy", {
      user: {
        email: req.user.email,
        username: userData.username || req.user.email.split("@")[0],
      },
    });
  } catch (err) {
    console.error("Error loading myAllergy:", err);
    res.status(500).send("Failed to load My Allergy page.");
  }
});

// Search allergens (autocomplete)
app.get("/api/allergens/search", requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) {
    return res.json([]); // more than 2 chars
  }

  try {
    const snapshot = await db
      .collection("allergens")
      .where("allergenLower", ">=", query)
      .where("allergenLower", "<=", query + "\uf8ff")
      .limit(10)
      .get();

    const results = snapshot.docs.map((doc) => doc.data());
    res.json(results);
  } catch (err) {
    console.error("Error searching allergens:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Search my allergy list
app.get("/api/me/allergies", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const snapshot = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("allergies")
      .get();

    const allergies = snapshot.docs.map((doc) => doc.data());
    res.json(allergies);
  } catch (err) {
    console.error("Error fetching allergies:", err);
    res.status(500).json({ error: "Failed to load allergies" });
  }
});

// Add allergy
app.post("/api/me/allergies", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { allergen } = req.body;
  if (!allergen) {
    return res.status(400).json({ error: "Allergen is required" });
  }

  try {
    const allergenRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("allergies")
      .doc(allergen.toLowerCase());

    await allergenRef.set({
      allergen,
      addedAt: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding allergy:", err);
    res.status(500).json({ error: "Failed to add allergy" });
  }
});

// Delete ALlergy
app.delete("/api/me/allergies/:name", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const allergenName = req.params.name;
  if (!allergenName) {
    return res.status(400).json({ error: "Allergen name is required" });
  }

  try {
    const allergenRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("allergies")
      .doc(allergenName.toLowerCase());

    await allergenRef.delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting allergy:", err);
    res.status(500).json({ error: "Failed to delete allergy" });
  }
});

//Profile
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
