const express = require("express");
const admin = require("../src/config/firebaseAdmin"); // firebase-admin 초기화
const router = express.Router();

router.post("/sessionLogin", async (req, res) => {
  const idToken = req.body.token;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    // save the cookie in session
    res.cookie("session", idToken, { httpOnly: true, secure: false });
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});

module.exports = router;
