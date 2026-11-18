const express = require("express");
const User = require("../models/User.js");
const auth = require("../middleware/auth.js");
const { validateRegister, validateLogin } = require("../middleware/validate.js");
const { signToken } = require("../utils/token.js");

const router = express.Router();

const authResponse = (user) => ({
  token: signToken(user.id),
  user: { _id: user.id, name: user.name, email: user.email },
});

router.post("/register", validateRegister, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json(authResponse(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json(authResponse(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
