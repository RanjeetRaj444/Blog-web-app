const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const blogRoutes = require("./routes/blogs.routes");
const authenticate = require("./middleware/auth.middleware");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/blogs", authenticate, blogRoutes);

app.get("/", (req, res) => {
  res.send("Server is up and running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});
