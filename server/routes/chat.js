const express = require("express");

const router = express.Router();

const MAX_MESSAGES = 30;
const MAX_TEXT = 4000;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are the helpful assistant for Panini8 Blog, a community blogging platform. " +
  "Help users with writing posts, ideas, tags and general questions. Keep answers concise.";

// Proxies chat requests to Groq so the API key never reaches the browser.
router.post("/", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "Chatbot is not configured" });
  }

  const { messages } = req.body || {};
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages.every(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= MAX_TEXT
    );
  if (!valid) return res.status(400).json({ message: "Invalid chat payload" });

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map(({ role, content }) => ({ role, content })),
        ],
        max_tokens: 1500,
        reasoning_effort: "low",
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Chat upstream error:", response.status);
      return res.status(502).json({ message: "Chatbot service error" });
    }
    const reply = data?.choices?.[0]?.message?.content?.trim();
    res.json({ reply: reply || "Sorry, I didn't understand that." });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(502).json({ message: "Chatbot service unavailable" });
  }
});

module.exports = router;
