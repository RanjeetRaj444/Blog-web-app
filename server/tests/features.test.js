import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { clean } from "../middleware/sanitize.js";

let mongod;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
afterEach(async () => {
  for (const c of Object.values(mongoose.connection.collections)) {
    await c.deleteMany({});
  }
});

const register = async (name = "Alice", email = "alice@example.com") => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "password123" });
  return { token: res.body.token, user: res.body.user, res };
};
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const makePost = (token, extra = {}) =>
  request(app)
    .post("/api/posts")
    .set(bearer(token))
    .send({ title: "Hello", content: "World", tags: [], ...extra });

describe("password policy", () => {
  it("requires at least 8 characters", async () => {
    const short = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob", email: "bob@x.io", password: "1234567" });
    expect(short.status).toBe(400);
    expect(short.body.message).toMatch(/8-128/);
    expect((await register()).res.status).toBe(201);
  });
});

describe("search and sorting", () => {
  it("searches title, content and tags case-insensitively and safely", async () => {
    const { token } = await register();
    await makePost(token, { title: "Learning Docker", content: "containers", tags: ["devops"] });
    await makePost(token, { title: "Cooking", content: "I love DOCKERized pasta", tags: [] });
    await makePost(token, { title: "Gardening", content: "plants", tags: ["Docker-tag"] });
    await makePost(token, { title: "Other", content: "nothing" });

    const hit = await request(app).get("/api/posts?q=docker");
    expect(hit.body.total).toBe(3);
    const none = await request(app).get("/api/posts?q=zzz");
    expect(none.body.posts).toHaveLength(0);
    // regex metacharacters are treated literally, never as a pattern or crash
    const meta = await request(app).get("/api/posts?q=" + encodeURIComponent(".*(["));
    expect(meta.status).toBe(200);
    expect(meta.body.total).toBe(0);
    const injection = await request(app).get("/api/posts?q[$ne]=x");
    expect(injection.status).toBe(200);
  });

  it("sorts by newest, oldest and popular", async () => {
    const a = await register();
    const b = await register("Bob", "bob@example.com");
    const p1 = (await makePost(a.token, { title: "first" })).body;
    const p2 = (await makePost(a.token, { title: "second" })).body;
    const p3 = (await makePost(a.token, { title: "third" })).body;
    for (const t of [a.token, b.token]) {
      await request(app).post(`/api/posts/${p2._id}/like`).set(bearer(t));
    }
    await request(app).post(`/api/posts/${p1._id}/like`).set(bearer(a.token));

    const titles = async (s) =>
      (await request(app).get(`/api/posts?sort=${s}`)).body.posts.map((p) => p.title);
    expect(await titles("newest")).toEqual(["third", "second", "first"]);
    expect(await titles("oldest")).toEqual(["first", "second", "third"]);
    expect(await titles("popular")).toEqual(["second", "first", "third"]);
    expect(await titles("bogus")).toEqual(["third", "second", "first"]);

    const paged = await request(app).get("/api/posts?sort=popular&limit=1&page=2");
    expect(paged.body.posts[0].title).toBe("first");
    expect(paged.body.posts[0].author.name).toBe("Alice"); // populated
    expect(p3).toBeTruthy();
  });
});

describe("comment editing", () => {
  it("lets only the author edit, and marks the comment as edited", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const post = (await makePost(alice.token)).body;
    const base = `/api/posts/${post._id}/comments`;
    const added = await request(app)
      .post(base)
      .set(bearer(bob.token))
      .send({ content: "typo" });
    const id = added.body[0]._id;

    const edit = (t, content) =>
      request(app).put(`${base}/${id}`).set(bearer(t)).send({ content });
    expect((await edit(alice.token, "hax")).status).toBe(403);
    expect((await edit(bob.token, "  ")).status).toBe(400);
    expect((await request(app).put(`${base}/${id}`).send({ content: "x" })).status).toBe(401);
    const ok = await edit(bob.token, "fixed");
    expect(ok.status).toBe(200);
    expect(ok.body[0]).toMatchObject({ content: "fixed", edited: true });
    expect(ok.body[0].author.name).toBe("Bob");
    expect(
      (await request(app).put(`${base}/64b7f0f0f0f0f0f0f0f0f0f0`).set(bearer(bob.token)).send({ content: "x" })).status
    ).toBe(404);
  });
});

describe("public author page", () => {
  it("exposes only public fields and the author's posts, without auth", async () => {
    const alice = await register();
    await makePost(alice.token, { title: "Mine" });
    const res = await request(app).get(`/api/users/${alice.user._id}/public`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Alice");
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.posts).toHaveLength(1);
    expect((await request(app).get("/api/users/bad/public")).status).toBe(404);
    expect(
      (await request(app).get("/api/users/64b7f0f0f0f0f0f0f0f0f0f0/public")).status
    ).toBe(404);
  });
});

describe("hardening", () => {
  it("healthz reports db status and responses carry a request id", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: true });
    expect(res.headers["x-request-id"]).toBeTruthy();
    const echoed = await request(app).get("/healthz").set("X-Request-Id", "abc-123");
    expect(echoed.headers["x-request-id"]).toBe("abc-123");
  });

  it("blocks NoSQL operator injection on login", async () => {
    await register();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { $ne: "x" }, password: { $ne: "x" } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  it("sanitize strips $ and dotted keys deeply", () => {
    expect(clean({ a: { $gt: 1, b: [{ $where: 1, ok: 2 }] }, "x.y": 3 })).toEqual({
      a: { b: [{ ok: 2 }] },
    });
  });
});
