const express = require("express");
const User = require("../models/User.js");
const Post = require("../models/Post.js");
const auth = require("../middleware/auth.js");

const router = express.Router();

router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.params.id !== req.user.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { name, bio } = req.body;

    const userFields = {};
    if (name) userFields.name = name;
    if (bio !== undefined) userFields.bio = bio;

    let user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/:id/posts", auth, async (req, res) => {
  try {
    if (req.params.id !== req.user.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate("author", "name")
      .lean();

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports= router;
