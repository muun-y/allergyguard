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

  // recent 3 histories
  const historySnap = await db
    .collection("users")
    .doc(req.user.uid)
    .collection("history")
    .orderBy("createdAt", "desc")
    .limit(3)
    .get();

  const history = historySnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.render("index", {
    user: {
      email: req.user.email,
      username: userData.username || req.user.email.split("@")[0],
    },
    allergies,
    history,
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

//scan page
app.get("/scan", requireAuth, async (req, res) => {
  try {
    res.render("scan", {
      user: req.user,
    });
  } catch (err) {
    console.error("Error loading scan page:", err);
    res.status(500).send("Failed to load Scan page.");
  }
});

// image upload API
app.post(
  "/api/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Upload buffer in cloudinary
      const result = await cloudinary.v2.uploader.upload_stream(
        { folder: "allergy-guard" },
        (err, result) => {
          if (err) {
            console.error("Cloudinary upload error:", err);
            return res.status(500).json({ error: "Upload failed" });
          }
          res.json({ url: result.secure_url });
        }
      );

      result.end(req.file.buffer); // 파일 전송
    } catch (err) {
      console.error("Upload failed:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// ocr result match
app.post("/api/scan/match", requireAuth, async (req, res) => {
  const { text, image } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });

  try {
    // user's allergy
    const snapshot = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("allergies")
      .get();

    const userAllergies = snapshot.docs.map((d) => d.data().allergen);

    // matching with user's allergy
    const lowerText = text.toLowerCase();
    const matched = userAllergies.filter((a) =>
      lowerText.includes(a.toLowerCase())
    );

    // save the result
    await db.collection("users").doc(req.user.uid).collection("history").add({
      text,
      matched,
      image,
      createdAt: new Date(),
    });

    res.json({ matched });
  } catch (err) {
    console.error("Scan match failed:", err);
    res.status(500).json({ error: "Match failed" });
  }
});

// Scan History page
app.get("/scan-history", requireAuth, async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("history")
      .orderBy("createdAt", "desc")
      .get();

    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.render("scanHistory", {
      user: req.user,
      history,
    });
  } catch (err) {
    console.error("Error loading history:", err);
    res.status(500).send("Failed to load scan history.");
  }
});

// Scan History Detail
app.get("/scan-history/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const docSnap = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("history")
      .doc(id)
      .get();

    if (!docSnap.exists) {
      return res.status(404).send("History not found");
    }

    const history = { id: docSnap.id, ...docSnap.data() };

    res.render("scanHistoryDetail", {
      user: req.user,
      history,
    });
  } catch (err) {
    console.error("Error loading history detail:", err);
    res.status(500).send("Failed to load history detail.");
  }
});

//Profile
app.get("/profile", requireAuth, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const allergiesSnap = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("allergies")
      .get();
    const historySnap = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("history")
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    const userData = userDoc.exists ? userDoc.data() : {};
    const allergies = allergiesSnap.docs.map((d) => d.data());
    const recentScans = historySnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    res.render("profile", {
      user: {
        email: req.user.email,
        username: userData.username || req.user.email.split("@")[0],
        profileImg: userData.profileImg || null,
      },
      allergies,
      historyCount: historySnap.size,
      recentScans,
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

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
