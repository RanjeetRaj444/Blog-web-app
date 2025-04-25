const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
// const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.js");
const postRoutes = require("./routes/posts.js");
const userRoutes = require("./routes/users.js");

// dotenv.config();
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Panini8 Blog API is running");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
