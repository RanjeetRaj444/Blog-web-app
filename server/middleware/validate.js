const mongoose = require("mongoose");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v) => (typeof v === "string" ? v.trim() : "");

const fail = (res, message) => res.status(400).json({ message });

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (str(name).length < 2 || str(name).length > 50)
    return fail(res, "Name must be 2-50 characters");
  if (!EMAIL_RE.test(str(email))) return fail(res, "Invalid email address");
  if (typeof password !== "string" || password.length < 8 || password.length > 128)
    return fail(res, "Password must be 8-128 characters");
  req.body = { name: str(name), email: str(email).toLowerCase(), password };
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!EMAIL_RE.test(str(email)) || typeof password !== "string" || !password)
    return fail(res, "Invalid credentials");
  req.body = { email: str(email).toLowerCase(), password };
  next();
};

const normalizeTags = (tags) => {
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
    ? tags.split(",")
    : [];
  return [
    ...new Set(list.map((t) => str(t)).filter((t) => t && t.length <= 30)),
  ].slice(0, 10);
};

const validatePost = (req, res, next) => {
  const { title, content, tags } = req.body || {};
  if (!str(title) || str(title).length > 150)
    return fail(res, "Title is required (max 150 characters)");
  if (!str(content) || str(content).length > 20000)
    return fail(res, "Content is required (max 20000 characters)");
  const { status } = req.body;
  if (status !== undefined && status !== "published" && status !== "draft")
    return fail(res, "Status must be 'published' or 'draft'");
  req.body = {
    title: str(title),
    content: str(content),
    tags: normalizeTags(tags),
    ...(status !== undefined ? { status } : {}),
  };
  next();
};

const validateComment = (req, res, next) => {
  const content = str(req.body && req.body.content);
  if (!content || content.length > 1000)
    return fail(res, "Comment is required (max 1000 characters)");
  req.body = { content };
  next();
};

const validateProfile = (req, res, next) => {
  const { name, bio } = req.body || {};
  const out = {};
  if (name !== undefined) {
    if (str(name).length < 2 || str(name).length > 50)
      return fail(res, "Name must be 2-50 characters");
    out.name = str(name);
  }
  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > 500)
      return fail(res, "Bio must be at most 500 characters");
    out.bio = bio.trim();
  }
  req.body = out;
  next();
};

// Rejects malformed ObjectIds with 404 instead of a CastError.
const validateObjectId =
  (...params) =>
  (req, res, next) => {
    for (const p of params) {
      if (!mongoose.isValidObjectId(req.params[p])) {
        return res.status(404).json({ message: "Resource not found" });
      }
    }
    next();
  };

module.exports = {
  validateRegister,
  validateLogin,
  validatePost,
  validateComment,
  validateProfile,
  validateObjectId,
};
