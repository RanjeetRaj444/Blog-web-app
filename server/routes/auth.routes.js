const express = require("express");
const UserModel = require("../models/auth.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await UserModel.find();
    res.status(200).send({
      Userdata: data,
    });
  } catch (error) {
    res.status(404).send({
      error,
    });
  }
});

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (user) {
      res.status(200).send({ massage: "User is already exist." });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      email,
      username,
      password: hashPassword,
    });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).send({
      message: "User created successfully",
      token,
    });
  } catch (error) {
    res.status(404).send({
      error,
    });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).send({
      message: "Login successful",
      token,
    });
  } catch (error) {
    res.status(404).send({
      error,
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    res.status(200).send({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(404).send({
      error,
    });
  }
});

router.get("/profile", async (req, res) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).send({ message: "No token provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Invalid token" });
    }
    try {
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.status(200).send({
        message: "Profile fetched successfully",
        user,
      });
    } catch (error) {
      res.status(404).send({
        error,
      });
    }
  });
});

module.exports = router;
