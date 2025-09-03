const admin = require("../src/config/firebaseAdmin");

async function checkAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.redirect("/login");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.redirect("/login");
  }
}

module.exports = checkAuth;
