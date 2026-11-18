const express = require("express");
const User = require("../models/User.js");
const Post = require("../models/Post.js");
const auth = require("../middleware/auth.js");
const {
  validateProfile,
  validateObjectId,
} = require("../middleware/validate.js");

const router = express.Router();

// Public author page: name, bio and their latest posts. No auth required.
router.get("/:id/public", validateObjectId("id"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name bio createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name")
      .lean();
    res.json({ user, posts });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// Own profile includes email; other users only expose public fields.
router.get("/:id", auth, validateObjectId("id"), async (req, res) => {
  try {
    const isSelf = req.params.id === req.user.user.id;
    const user = await User.findById(req.params.id).select(
      isSelf ? "-password" : "name bio createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put(
  "/:id",
  auth,
  validateObjectId("id"),
  validateProfile,
  async (req, res) => {
    try {
      if (req.params.id !== req.user.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      ).select("-password");

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get("/:id/posts", auth, validateObjectId("id"), async (req, res) => {
  try {
    if (req.params.id !== req.user.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate("author", "name")
      .lean();

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
