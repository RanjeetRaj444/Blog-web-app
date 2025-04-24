const express = require("express");
const Blog = require("../models/blog.model");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().populate("userId", "username email");
    res.status(200).send(blogs);
  } catch (error) {
    res.status(500).send({ error });
  }
});

router.post("/", async (req, res) => {
  const { title, content } = req.body;
  try {
    const newBlog = new Blog({ title, content, userId: req.user.id });
    if (!newBlog) {
      return res.status(400).send({ message: "Blog creation failed" });
    }

    await newBlog.save();
    res
      .status(201)
      .send({ message: "Blog created successfully", blog: newBlog });
  } catch (error) {
    res.status(400).send({ error });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).send({ message: "Blog not found" });
    }
    res.status(200).send({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).send({ error });
  }
});

router.patch("/:id/like", async (req, res) => {
  try {
    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.status(200).send({ message: "Blog liked", blog: updated });
  } catch (error) {
    res.status(500).send({ error });
  }
});

router.post("/:id/comment", async (req, res) => {
  const { comment } = req.body;
  try {
    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: comment } },
      { new: true }
    );
    res.status(200).send({ message: "Comment added", blog: updated });
  } catch (error) {
    res.status(500).send({ error });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true }
    );
    if (!blog) {
      return res.status(404).send({ message: "Blog not found" });
    }
    res.status(200).send({ blog });
  } catch (error) {
    res.status(500).send({ error });
  }
});

module.exports = router;
