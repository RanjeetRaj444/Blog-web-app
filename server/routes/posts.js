const express = require("express");
const Post = require("../models/Post.js");
const auth = require("../middleware/auth.js");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "name")
      .lean();

    const userId = req.header("Authorization") ? req.user?.user?.id : null;

    if (userId) {
      posts.forEach((post) => {
        post.isLikedByCurrentUser = post.likes.some(
          (like) => like.toString() === userId
        );
      });
    }

    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name")
      .populate("comments.author", "name")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.header("Authorization") ? req.user?.user?.id : null;

    if (userId) {
      post.isLikedByCurrentUser = post.likes.some(
        (like) => like.toString() === userId
      );
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const newPost = new Post({
      title,
      content,
      tags,
      author: req.user.user.id,
    });

    const post = await newPost.save();

    await post.populate("author", "name");

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.author.toString() !== req.user.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }
    post.title = title;
    post.content = content;
    post.tags = tags;
    post.updatedAt = Date.now();

    await post.save();

    await post.populate("author", "name");

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await post.deleteOne();

    res.json({ message: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const isLiked = post.likes.some(
      (like) => like.toString() === req.user.user.id
    );

    if (isLiked) {
      post.likes = post.likes.filter(
        (like) => like.toString() !== req.user.user.id
      );
    } else {
      post.likes.push(req.user.user.id);
    }

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.post("/:id/comments", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const newComment = {
      content: req.body.content,
      author: req.user.user.id,
    };

    post.comments.unshift(newComment);

    await post.save();

    await Post.populate(post, {
      path: "comments.author",
      select: "name",
    });

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

router.delete("/:id/comments/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.find(
      (comment) => comment._id.toString() === req.params.comment_id
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    post.comments = post.comments.filter(
      (comment) => comment._id.toString() !== req.params.comment_id
    );

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Resource not found" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports= router;
