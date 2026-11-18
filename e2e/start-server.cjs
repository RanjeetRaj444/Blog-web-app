// Starts the real API (server/app.js) on an in-memory MongoDB for E2E runs.
// Groq calls are stubbed, so no real API key is ever used.
const path = require("path");
const { createRequire } = require("module");

const serverDir = path.join(__dirname, "..", "server");
const requireFromServer = createRequire(path.join(serverDir, "package.json"));

process.env.NODE_ENV = "test"; // disables rate limits and request logging
process.env.JWT_SECRET = "e2e-secret";
process.env.GROQ_API_KEY = "fake";
process.env.PORT = "5055";
// Reuse the mongod binary already cached by the server's tests (avoids a ~200MB download).
process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR ||
  path.join(serverDir, "node_modules", ".cache", "mongodb-memory-server");

const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (String(url).includes("api.groq.com")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Stubbed bot reply" } }],
      }),
    };
  }
  return realFetch(url, opts);
};

(async () => {
  const mongoose = requireFromServer("mongoose");
  const { MongoMemoryServer } = requireFromServer("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const app = requireFromServer("./app.js");
  app.listen(5055, () => console.log("E2E API listening on 5055"));

  const stop = async () => {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})();
