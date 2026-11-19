import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { isPasswordBreached } from "../utils/pwned.js";

// Models are registered by app.js (CJS); fetch them from mongoose to avoid a duplicate instance.
const User = mongoose.model("User");
const Post = mongoose.model("Post");

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
  vi.unstubAllGlobals();
  delete process.env.PWNED_CHECK;
  delete process.env.CLIENT_ORIGIN;
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
    .send({ title: "Hello", content: "World", tags: ["t"], ...extra });
const login = (email, password) =>
  request(app).post("/api/auth/login").send({ email, password });

describe("account lockout", () => {
  it("locks after 5 consecutive failures, even for the right password", async () => {
    await register();
    for (let i = 0; i < 5; i++) {
      const bad = await login("alice@example.com", "wrong-password");
      expect(bad.status).toBe(400);
      expect(bad.body.message).toBe("Invalid credentials");
    }
    const locked = await login("alice@example.com", "password123");
    expect(locked.status).toBe(429);
    expect(locked.body.message).toMatch(
      /^Too many failed attempts\. Try again in \d+ minutes\.$/
    );
    expect(locked.body.token).toBeUndefined();
    const wrongWhileLocked = await login("alice@example.com", "nope-nope");
    expect(wrongWhileLocked.status).toBe(429);
  });

  it("success resets the counter; failures must be consecutive", async () => {
    await register();
    for (let i = 0; i < 4; i++) await login("alice@example.com", "wrong-password");
    expect((await login("alice@example.com", "password123")).status).toBe(200);
    for (let i = 0; i < 4; i++) await login("alice@example.com", "wrong-password");
    expect((await login("alice@example.com", "password123")).status).toBe(200);
    const user = await User.findOne({ email: "alice@example.com" });
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockUntil).toBeUndefined();
  });

  it("an expired lock allows login again and restarts the count", async () => {
    await register();
    for (let i = 0; i < 5; i++) await login("alice@example.com", "wrong-password");
    await User.updateOne(
      { email: "alice@example.com" },
      { $set: { lockUntil: new Date(Date.now() - 1000) } }
    );
    expect((await login("alice@example.com", "password123")).status).toBe(200);

    // lock again, expire it, then fail once: count restarts at 1 (no instant relock)
    for (let i = 0; i < 5; i++) await login("alice@example.com", "wrong-password");
    await User.updateOne(
      { email: "alice@example.com" },
      { $set: { lockUntil: new Date(Date.now() - 1000) } }
    );
    expect((await login("alice@example.com", "wrong-password")).status).toBe(400);
    const user = await User.findOne({ email: "alice@example.com" });
    expect(user.failedLoginAttempts).toBe(1);
    expect(user.lockUntil).toBeUndefined();
  });

  it("unknown emails look exactly like a wrong password and never lock", async () => {
    for (let i = 0; i < 7; i++) {
      const res = await login("ghost@example.com", "whatever-pw");
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid credentials");
    }
  });

  it("does not leak lock fields or bookmarks via the user endpoints", async () => {
    const { token, user } = await register();
    const me = await request(app).get("/api/auth/user").set(bearer(token));
    for (const k of ["password", "bookmarks", "failedLoginAttempts", "lockUntil"]) {
      expect(me.body[k]).toBeUndefined();
    }
    const own = await request(app).get(`/api/users/${user._id}`).set(bearer(token));
    expect(own.body.bookmarks).toBeUndefined();
    expect(own.body.failedLoginAttempts).toBeUndefined();
    const upd = await request(app)
      .put(`/api/users/${user._id}`)
      .set(bearer(token))
      .send({ bio: "hi" });
    expect(upd.body.lockUntil).toBeUndefined();
    expect(upd.body.bookmarks).toBeUndefined();
  });
});

describe("breached password check", () => {
  const sha = (p) => crypto.createHash("sha1").update(p).digest("hex").toUpperCase();
  const body = { name: "Bob", email: "bob@example.com", password: "password123" };

  it("is skipped under NODE_ENV=test unless PWNED_CHECK=on", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await isPasswordBreached("password123")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a breached password using only the 5-char hash prefix", async () => {
    process.env.PWNED_CHECK = "on";
    const hash = sha(body.password);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `0000000000000000000000000000000000A:0\r\n${hash.slice(5)}:12345\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:2`,
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "This password has appeared in a data breach. Please choose a different one."
    );
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(url).not.toContain(hash.slice(5));
    expect(opts.headers["Add-Padding"]).toBe("true");
    expect(opts.signal).toBeDefined();
    expect(await User.countDocuments()).toBe(0);
  });

  it("allows a password whose suffix is absent or only padding (count 0)", async () => {
    process.env.PWNED_CHECK = "on";
    const hash = sha(body.password);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `${hash.slice(5)}:0\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:9`,
      })
    );
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
  });

  it("fails open on network errors, bad status and timeouts", async () => {
    process.env.PWNED_CHECK = "on";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await isPasswordBreached("whatever123")).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await isPasswordBreached("whatever123")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => { throw new Error("bad"); } })
    );
    expect(await isPasswordBreached("whatever123")).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError")));
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
  });
});

describe("drafts", () => {
  it("validates status and defaults to published", async () => {
    const { token } = await register();
    expect((await makePost(token, { status: "weird" })).status).toBe(400);
    const pub = await makePost(token);
    expect(pub.body.status).toBe("published");
    const draft = await makePost(token, { status: "draft" });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe("draft");
  });

  it("hides drafts from lists, search, tags and public author page", async () => {
    const alice = await register();
    await makePost(alice.token, { title: "Public one", tags: ["pub"] });
    await makePost(alice.token, { title: "Secret draft", tags: ["hidden"], status: "draft" });
    // a legacy post with no status field counts as published
    await Post.collection.insertOne({
      title: "Legacy",
      content: "old",
      tags: ["legacy"],
      author: new mongoose.Types.ObjectId(alice.user._id),
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const auth of [{}, bearer(alice.token)]) {
      const list = await request(app).get("/api/posts").set(auth);
      expect(list.body.posts.map((p) => p.title).sort()).toEqual(["Legacy", "Public one"]);
      expect(list.body.total).toBe(2);
      expect((await request(app).get("/api/posts?q=secret").set(auth)).body.total).toBe(0);
      expect((await request(app).get("/api/posts?sort=popular").set(auth)).body.total).toBe(2);
    }
    expect((await request(app).get("/api/posts/tags")).body).toEqual(["legacy", "pub"]);
    const pub = await request(app).get(`/api/users/${alice.user._id}/public`);
    expect(pub.body.posts.map((p) => p.title).sort()).toEqual(["Legacy", "Public one"]);
  });

  it("only the author can open a draft by id; others get 404", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const { body: draft } = await makePost(alice.token, { status: "draft" });
    const url = `/api/posts/${draft._id}`;
    expect((await request(app).get(url)).status).toBe(404);
    expect((await request(app).get(url).set(bearer(bob.token))).status).toBe(404);
    const own = await request(app).get(url).set(bearer(alice.token));
    expect(own.status).toBe(200);
    expect(own.body.status).toBe("draft");
  });

  it("non-authors cannot like, comment, edit/delete comments or bookmark a draft", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const { body: draft } = await makePost(alice.token, { status: "draft" });
    const base = `/api/posts/${draft._id}`;

    expect((await request(app).post(`${base}/like`).set(bearer(bob.token))).status).toBe(404);
    expect(
      (await request(app).post(`${base}/comments`).set(bearer(bob.token)).send({ content: "hi" })).status
    ).toBe(404);
    expect((await request(app).post(`${base}/bookmark`).set(bearer(bob.token))).status).toBe(404);
    const anyId = "64b7f0f0f0f0f0f0f0f0f0f0";
    expect(
      (await request(app).put(`${base}/comments/${anyId}`).set(bearer(bob.token)).send({ content: "x" })).status
    ).toBe(404);
    expect((await request(app).delete(`${base}/comments/${anyId}`).set(bearer(bob.token))).status).toBe(404);

    // the author can still interact with their own draft
    expect((await request(app).post(`${base}/like`).set(bearer(alice.token))).status).toBe(200);
    expect(
      (await request(app).post(`${base}/comments`).set(bearer(alice.token)).send({ content: "note" })).status
    ).toBe(201);
  });

  it("publishing a draft makes it visible; status is kept when omitted on edit", async () => {
    const alice = await register();
    const { body: draft } = await makePost(alice.token, { status: "draft" });
    const put = (extra) =>
      request(app)
        .put(`/api/posts/${draft._id}`)
        .set(bearer(alice.token))
        .send({ title: "T", content: "C", tags: [], ...extra });

    expect((await put({ status: "nope" })).status).toBe(400);
    expect((await put({})).body.status).toBe("draft");
    expect((await request(app).get("/api/posts")).body.total).toBe(0);
    expect((await put({ status: "published" })).body.status).toBe("published");
    expect((await request(app).get("/api/posts")).body.total).toBe(1);
    expect((await request(app).get(`/api/posts/${draft._id}`)).status).toBe(200);
    expect((await put({ status: "draft" })).body.status).toBe("draft");
    expect((await request(app).get(`/api/posts/${draft._id}`)).status).toBe(404);
  });

  it("GET /users/:id/posts includes drafts and always carries status", async () => {
    const alice = await register();
    await makePost(alice.token, { title: "Pub" });
    await makePost(alice.token, { title: "Dr", status: "draft" });
    await Post.collection.insertOne({
      title: "Legacy",
      content: "old",
      tags: [],
      author: new mongoose.Types.ObjectId(alice.user._id),
      likes: [],
      comments: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    const res = await request(app)
      .get(`/api/users/${alice.user._id}/posts`)
      .set(bearer(alice.token));
    const byTitle = Object.fromEntries(res.body.map((p) => [p.title, p.status]));
    expect(byTitle).toEqual({ Pub: "published", Dr: "draft", Legacy: "published" });
  });
});

describe("bookmarks", () => {
  it("requires auth", async () => {
    expect((await request(app).get("/api/posts/bookmarks")).status).toBe(401);
    expect(
      (await request(app).post("/api/posts/64b7f0f0f0f0f0f0f0f0f0f0/bookmark")).status
    ).toBe(401);
  });

  it("toggles, lists newest bookmark first and flags posts for the viewer", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const p1 = (await makePost(alice.token, { title: "one" })).body;
    const p2 = (await makePost(alice.token, { title: "two" })).body;
    const p3 = (await makePost(alice.token, { title: "three" })).body;
    const toggle = (id) =>
      request(app).post(`/api/posts/${id}/bookmark`).set(bearer(bob.token));

    expect((await toggle(p1._id)).body).toEqual({ bookmarked: true });
    expect((await toggle(p3._id)).body).toEqual({ bookmarked: true });
    expect((await toggle(p2._id)).body).toEqual({ bookmarked: true });

    const list = await request(app).get("/api/posts/bookmarks").set(bearer(bob.token));
    expect(list.status).toBe(200);
    expect(list.body.map((p) => p.title)).toEqual(["two", "three", "one"]);
    expect(list.body[0].author.name).toBe("Alice");
    expect(list.body.every((p) => p.isBookmarkedByCurrentUser)).toBe(true);

    const feed = await request(app).get("/api/posts").set(bearer(bob.token));
    expect(feed.body.posts.every((p) => p.isBookmarkedByCurrentUser === true)).toBe(true);
    const aliceFeed = await request(app).get("/api/posts").set(bearer(alice.token));
    expect(aliceFeed.body.posts.every((p) => p.isBookmarkedByCurrentUser === false)).toBe(true);
    const anon = await request(app).get("/api/posts");
    expect(anon.body.posts[0].isBookmarkedByCurrentUser).toBeUndefined();
    const single = await request(app).get(`/api/posts/${p1._id}`).set(bearer(bob.token));
    expect(single.body.isBookmarkedByCurrentUser).toBe(true);

    expect((await toggle(p1._id)).body).toEqual({ bookmarked: false });
    const after = await request(app).get("/api/posts/bookmarks").set(bearer(bob.token));
    expect(after.body.map((p) => p.title)).toEqual(["two", "three"]);
    const unflagged = await request(app).get(`/api/posts/${p1._id}`).set(bearer(bob.token));
    expect(unflagged.body.isBookmarkedByCurrentUser).toBe(false);
  });

  it("skips deleted and unpublished posts and 404s for missing ones", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const keep = (await makePost(alice.token, { title: "keep" })).body;
    const gone = (await makePost(alice.token, { title: "gone" })).body;
    const later = (await makePost(alice.token, { title: "later-draft" })).body;
    for (const p of [keep, gone, later]) {
      await request(app).post(`/api/posts/${p._id}/bookmark`).set(bearer(bob.token));
    }
    await request(app).delete(`/api/posts/${gone._id}`).set(bearer(alice.token));
    await request(app)
      .put(`/api/posts/${later._id}`)
      .set(bearer(alice.token))
      .send({ title: "later-draft", content: "C", tags: [], status: "draft" });

    const list = await request(app).get("/api/posts/bookmarks").set(bearer(bob.token));
    expect(list.status).toBe(200);
    expect(list.body.map((p) => p.title)).toEqual(["keep"]);

    expect(
      (await request(app).post(`/api/posts/${gone._id}/bookmark`).set(bearer(bob.token))).status
    ).toBe(404);
    expect(
      (await request(app).post("/api/posts/not-an-id/bookmark").set(bearer(bob.token))).status
    ).toBe(404);
  });

  it("returns 401 for a valid token whose user was deleted", async () => {
    const alice = await register();
    const post = (await makePost(alice.token)).body;
    await User.deleteOne({ _id: alice.user._id });
    const res = await request(app)
      .post(`/api/posts/${post._id}/bookmark`)
      .set(bearer(alice.token));
    expect(res.status).toBe(401);
  });
});

describe("sitemap.xml", () => {
  it("lists the homepage and published posts only, as XML", async () => {
    process.env.CLIENT_ORIGIN = "https://blog.example.com/, https://other.example.com";
    const alice = await register();
    const pub = (await makePost(alice.token, { title: "Public" })).body;
    const draft = (await makePost(alice.token, { title: "Hidden", status: "draft" })).body;

    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.text).toContain("<loc>https://blog.example.com/</loc>");
    expect(res.text).toContain(`<loc>https://blog.example.com/post/${pub._id}</loc>`);
    expect(res.text).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T[\d:.]+Z<\/lastmod>/);
    expect(res.text).not.toContain(draft._id);
    expect(res.text).not.toContain("other.example.com");
  });

  it("falls back to localhost when CLIENT_ORIGIN is unset", async () => {
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain("<loc>http://localhost:5173/</loc>");
  });
});
