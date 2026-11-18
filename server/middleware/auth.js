const jwt = require("jsonwebtoken");

const getToken = (req) => {
  const header = req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token && token !== "null" && token !== "undefined" ? token : null;
};

// Requires a valid token.
const auth = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Attaches req.user when a valid token is present; never rejects.
const optionalAuth = (req, res, next) => {
  const token = getToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // ignore invalid/expired token on public routes
    }
  }
  next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
