// Strips MongoDB operator keys ("$ne", "$gt", "a.b") from request bodies so
// user input can never be interpreted as a query operator (NoSQL injection).
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = clean(val);
    }
    return out;
  }
  return value;
};

module.exports = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  next();
};
module.exports.clean = clean;
