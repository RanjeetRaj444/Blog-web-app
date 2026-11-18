const express = require("express");
const Post = require("../models/Post.js");
const auth = require("../middleware/auth.js");
const { optionalAuth } = auth;
const {
  validatePost,
  validateComment,
  validateObjectId,
} = require("../middleware/validate.js");

const router = express.Router();

const MAX_COMMENTS_PER_POST = 500;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const markLiked = (post, userId) => {
  if (userId) {
    post.isLikedByCurrentUser = post.likes.some((l) => l.toString() === userId);
  }
};

// Paginated list. Query: page (default 1), limit (default 12, max 50), tag,
// q (search title/content/tags), sort (newest | oldest | popular).
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const filter = {};
    if (typeof req.query.tag === "string" && req.query.tag) {
      filter.tags = req.query.tag;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: rx }, { content: rx }, { tags: rx }];
    }
    const sort = ["newest", "oldest", "popular"].includes(req.query.sort)
      ? req.query.sort
      : "newest";
    const skip = (page - 1) * limit;

    const listPosts = async () => {
      if (sort === "popular") {
        const rows = await Post.aggregate([
          { $match: filter },
          { $addFields: { likesCount: { $size: "$likes" } } },
          { $sort: { likesCount: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ]);
        return Post.populate(rows, { path: "author", select: "name" });
      }
      return Post.find(filter)
        .sort({ createdAt: sort === "oldest" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name")
        .lean();
    };

    const [posts, total] = await Promise.all([
      listPosts(),
      Post.countDocuments(filter),
    ]);

    const userId = req.user?.user?.id;
    posts.forEach((post) => markLiked(post, userId));

    res.json({ posts, page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const tags = await Post.distinct("tags");
    res.json(tags.sort());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/:id", optionalAuth, validateObjectId("id"), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name")
      .populate("comments.author", "name")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    markLiked(post, req.user?.user?.id);
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/", auth, validatePost, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const post = await Post.create({
      title,
      content,
      tags,
      author: req.user.user.id,
    });
    await post.populate("author", "name");

    res.status(201).json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put(
  "/:id",
  auth,
  validateObjectId("id"),
  validatePost,
  async (req, res) => {
    try {
      const { title, content, tags } = req.body;

      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.author.toString() !== req.user.user.id) {
        return res.status(403).json({ message: "User not authorized" });
      }

      post.title = title;
      post.content = content;
      post.tags = tags;
      await post.save();
      await post.populate("author", "name");

      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.delete("/:id", auth, validateObjectId("id"), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.author.toString() !== req.user.user.id) {
      return res.status(403).json({ message: "User not authorized" });
    }

    await post.deleteOne();
    res.json({ message: "Post removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// Atomic toggle: avoids lost updates from concurrent likes.
router.post("/:id/like", auth, validateObjectId("id"), async (req, res) => {
  try {
    const userId = req.user.user.id;
    const existing = await Post.findById(req.params.id).select("likes");
    if (!existing) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isLiked = existing.likes.some((l) => l.toString() === userId);
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true }
    ).select("likes");

    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post(
  "/:id/comments",
  auth,
  validateObjectId("id"),
  validateComment,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.comments.length >= MAX_COMMENTS_PER_POST) {
        return res
          .status(400)
          .json({ message: "Comment limit reached for this post" });
      }

      post.comments.unshift({
        content: req.body.content,
        author: req.user.user.id,
      });
      await post.save();
      await Post.populate(post, { path: "comments.author", select: "name" });

      res.status(201).json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.put(
  "/:id/comments/:comment_id",
  auth,
  validateObjectId("id", "comment_id"),
  validateComment,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const comment = post.comments.id(req.params.comment_id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.author.toString() !== req.user.user.id) {
        return res.status(403).json({ message: "User not authorized" });
      }

      comment.content = req.body.content;
      comment.edited = true;
      await post.save();
      await Post.populate(post, { path: "comments.author", select: "name" });

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.delete(
  "/:id/comments/:comment_id",
  auth,
  validateObjectId("id", "comment_id"),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = post.comments.id(req.params.comment_id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.author.toString() !== req.user.user.id) {
        return res.status(403).json({ message: "User not authorized" });
      }

      comment.deleteOne();
      await post.save();
      await Post.populate(post, { path: "comments.author", select: "name" });

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

module.exports = router;
