const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth.js");
const postRoutes = require("./routes/posts.js");
const userRoutes = require("./routes/users.js");
const chatRoutes = require("./routes/chat.js");
const sanitize = require("./middleware/sanitize.js");
const logger = require("./utils/logger.js");
const mongoose = require("mongoose");
const sitemapRoute = require("./routes/sitemap.js");

const app = express();
// Render sits behind a proxy; needed for correct client IPs in rate limiting.
app.set("trust proxy", 1);

app.use(logger);
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(sanitize);

// CLIENT_ORIGIN: comma-separated list of allowed origins.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
if (!allowedOrigins.length) {
  console.warn("CLIENT_ORIGIN not set: CORS allows all origins");
}
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : "*" }));

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    skip: () => process.env.NODE_ENV === "test",
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

app.use(limiter(15 * 60 * 1000, 300, "Too many requests, try again later"));
app.use(
  "/api/auth/login",
  limiter(15 * 60 * 1000, 10, "Too many login attempts, try again later")
);
app.use(
  "/api/auth/register",
  limiter(60 * 60 * 1000, 10, "Too many registrations, try again later")
);
app.use("/api/chat", limiter(60 * 1000, 15, "Too many chat messages, slow down"));

app.get("/healthz", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp });
});

app.get("/sitemap.xml", sitemapRoute);

app.get("/", (req, res) => {
  res.send("Panini8 Blog API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  res.status(500).json({ message: "Something went wrong!" });
});

module.exports = app;
