const pino = require("pino");
const pinoHttp = require("pino-http");
const { randomUUID } = require("crypto");

const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : process.env.LOG_LEVEL || "info",
  // never log credentials
  redact: ["req.headers.authorization", "req.headers.cookie"],
});

// Structured request logs with a request id (echoed back as X-Request-Id).
module.exports = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
});
