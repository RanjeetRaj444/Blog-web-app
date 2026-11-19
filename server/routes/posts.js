const express = require("express");
const Post = require("../models/Post.js");
const User = require("../models/User.js");
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

// Old documents may have no status; treat them as published.
const NOT_DRAFT = { $ne: "draft" };

const authorId = (post) => String(post.author?._id || post.author);

// A draft is visible only to its author.
const isHiddenDraft = (post, userId) =>
  post.status === "draft" && authorId(post) !== userId;

const getBookmarkSet = async (userId) => {
  if (!userId) return new Set();
  const user = await User.findById(userId).select("bookmarks").lean();
  return new Set((user?.bookmarks || []).map(String));
};

const markFlags = (post, userId, bookmarks) => {
  if (userId) {
    post.isLikedByCurrentUser = post.likes.some((l) => l.toString() === userId);
    post.isBookmarkedByCurrentUser = bookmarks.has(String(post._id));
  }
};

// Paginated list. Query: page (default 1), limit (default 12, max 50), tag,
// q (search title/content/tags), sort (newest | oldest | popular).
router.get("/", optionalAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const filter = { status: NOT_DRAFT };
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
    const bookmarks = await getBookmarkSet(userId);
    posts.forEach((post) => markFlags(post, userId, bookmarks));

    res.json({ posts, page, pages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const tags = await Post.distinct("tags", { status: NOT_DRAFT });
    res.json(tags.sort());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// Bookmarked published posts, newest bookmark first. Must stay above "/:id".
router.get("/bookmarks", auth, async (req, res) => {
  try {
    const userId = req.user.user.id;
    const user = await User.findById(userId).select("bookmarks").lean();
    const ids = [...(user?.bookmarks || [])].reverse();
    const found = await Post.find({ _id: { $in: ids }, status: NOT_DRAFT })
      .populate("author", "name")
      .lean();
    const byId = new Map(found.map((p) => [String(p._id), p]));
    // Posts deleted since bookmarking are simply skipped.
    const posts = ids.map((id) => byId.get(String(id))).filter(Boolean);
    const bookmarks = new Set(ids.map(String));
    posts.forEach((post) => markFlags(post, userId, bookmarks));
    res.json(posts);
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

    const userId = req.user?.user?.id;
    if (!post || isHiddenDraft(post, userId)) {
      return res.status(404).json({ message: "Post not found" });
    }

    markFlags(post, userId, await getBookmarkSet(userId));
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/", auth, validatePost, async (req, res) => {
  try {
    const { title, content, tags, status } = req.body;

    const post = await Post.create({
      title,
      content,
      tags,
      ...(status ? { status } : {}),
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
      const { title, content, tags, status } = req.body;

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
      if (status) post.status = status;
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
    const existing = await Post.findById(req.params.id).select(
      "likes status author"
    );
    if (!existing || isHiddenDraft(existing, userId)) {
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

// Toggle a bookmark; responds with the new state.
router.post("/:id/bookmark", auth, validateObjectId("id"), async (req, res) => {
  try {
    const userId = req.user.user.id;
    const post = await Post.findById(req.params.id).select("status author");
    if (!post || isHiddenDraft(post, userId)) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(userId).select("bookmarks");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    const bookmarked = !user.bookmarks.some((b) => String(b) === req.params.id);
    await User.updateOne(
      { _id: userId },
      bookmarked
        ? { $addToSet: { bookmarks: req.params.id } }
        : { $pull: { bookmarks: req.params.id } }
    );
    res.json({ bookmarked });
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
      if (!post || isHiddenDraft(post, req.user.user.id)) {
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
      if (!post || isHiddenDraft(post, req.user.user.id)) {
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
      if (!post || isHiddenDraft(post, req.user.user.id)) {
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
