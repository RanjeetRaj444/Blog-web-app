import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";

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
  for (const c of Object.values(mongoose.connection.collections)) {
    await c.deleteMany({});
  }
});

const register = async (name = "Alice", email = "alice@example.com") => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "secret12" });
  return { token: res.body.token, user: res.body.user, res };
};
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const makePost = (token, extra = {}) =>
  request(app)
    .post("/api/posts")
    .set(bearer(token))
    .send({ title: "Hello", content: "World", tags: ["a", "b"], ...extra });

describe("auth", () => {
  it("registers, normalises email and never returns the password", async () => {
    const { res } = await register("  Alice ", "ALICE@Example.com");
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(JSON.stringify(res.body)).not.toContain("secret12");
  });

  it("rejects duplicate and invalid registrations", async () => {
    await register();
    expect((await register()).res.status).toBe(400);
    const bad = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "nope", password: "1" });
    expect(bad.status).toBe(400);
  });

  it("logs in with correct credentials only", async () => {
    await register();
    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "secret12" });
    expect(ok.status).toBe(200);
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "wrong!!" });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe("Invalid credentials");
  });

  it("GET /user requires a valid token", async () => {
    const { token } = await register();
    expect((await request(app).get("/api/auth/user")).status).toBe(401);
    expect(
      (await request(app).get("/api/auth/user").set(bearer("garbage"))).status
    ).toBe(401);
    const me = await request(app).get("/api/auth/user").set(bearer(token));
    expect(me.status).toBe(200);
    expect(me.body.password).toBeUndefined();
  });
});

describe("posts", () => {
  it("requires auth to create and validates input", async () => {
    expect((await request(app).post("/api/posts").send({})).status).toBe(401);
    const { token } = await register();
    expect((await makePost(token, { title: "" })).status).toBe(400);
    expect((await makePost(token, { content: "" })).status).toBe(400);
  });

  it("creates posts, normalising tags", async () => {
    const { token } = await register();
    const res = await makePost(token, { tags: [" a ", "a", "", "b"] });
    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual(["a", "b"]);
    expect(res.body.author.name).toBe("Alice");
  });

  it("paginates and filters by tag", async () => {
    const { token } = await register();
    for (let i = 0; i < 5; i++) {
      await makePost(token, {
        title: `P${i}`,
        tags: i % 2 ? ["odd"] : ["even"],
      });
    }
    const p1 = await request(app).get("/api/posts?limit=2&page=1");
    expect(p1.body).toMatchObject({ page: 1, pages: 3, total: 5 });
    expect(p1.body.posts).toHaveLength(2);
    expect(p1.body.posts[0].title).toBe("P4"); // newest first
    const odd = await request(app).get("/api/posts?tag=odd");
    expect(odd.body.total).toBe(2);
    const tags = await request(app).get("/api/posts/tags");
    expect(tags.body).toEqual(["even", "odd"]);
  });

  it("returns 404 for unknown and malformed ids", async () => {
    expect((await request(app).get("/api/posts/not-an-id")).status).toBe(404);
    expect(
      (await request(app).get("/api/posts/64b7f0f0f0f0f0f0f0f0f0f0")).status
    ).toBe(404);
  });

  it("only the author can edit or delete (403 otherwise)", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const { body: post } = await makePost(alice.token);

    const edit = (t) =>
      request(app)
        .put(`/api/posts/${post._id}`)
        .set(bearer(t))
        .send({ title: "New", content: "Body", tags: [] });
    expect((await edit(bob.token)).status).toBe(403);
    const ok = await edit(alice.token);
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe("New");

    const del = (t) =>
      request(app).delete(`/api/posts/${post._id}`).set(bearer(t));
    expect((await del(bob.token)).status).toBe(403);
    expect((await del(alice.token)).status).toBe(200);
    expect((await request(app).get(`/api/posts/${post._id}`)).status).toBe(404);
  });

  it("likes toggle and isLikedByCurrentUser reflects the viewer", async () => {
    const alice = await register();
    const { body: post } = await makePost(alice.token);
    const like = () =>
      request(app).post(`/api/posts/${post._id}/like`).set(bearer(alice.token));

    expect((await like()).body).toHaveLength(1);
    const liked = await request(app)
      .get(`/api/posts/${post._id}`)
      .set(bearer(alice.token));
    expect(liked.body.isLikedByCurrentUser).toBe(true);
    const list = await request(app).get("/api/posts").set(bearer(alice.token));
    expect(list.body.posts[0].isLikedByCurrentUser).toBe(true);
    // a bad/placeholder token still works and is simply "not liked"
    const anon = await request(app)
      .get(`/api/posts/${post._id}`)
      .set(bearer("null"));
    expect(anon.status).toBe(200);
    expect(anon.body.isLikedByCurrentUser).toBeUndefined();

    expect((await like()).body).toHaveLength(0);
    expect((await request(app).post(`/api/posts/${post._id}/like`)).status).toBe(
      401
    );
  });

  it("concurrent likes from different users are all kept", async () => {
    const users = [];
    for (let i = 0; i < 5; i++) {
      users.push(await register(`User${i}`, `u${i}@x.io`));
    }
    const { body: post } = await makePost(users[0].token);
    await Promise.all(
      users.map((u) =>
        request(app).post(`/api/posts/${post._id}/like`).set(bearer(u.token))
      )
    );
    const res = await request(app).get(`/api/posts/${post._id}`);
    expect(res.body.likes).toHaveLength(5);
  });
});

describe("comments", () => {
  it("adds and deletes comments with author checks", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");
    const { body: post } = await makePost(alice.token);
    const url = `/api/posts/${post._id}/comments`;

    expect((await request(app).post(url).send({ content: "hi" })).status).toBe(
      401
    );
    expect(
      (
        await request(app)
          .post(url)
          .set(bearer(bob.token))
          .send({ content: " " })
      ).status
    ).toBe(400);

    const add = await request(app)
      .post(url)
      .set(bearer(bob.token))
      .send({ content: "Nice post" });
    expect(add.status).toBe(201);
    expect(add.body[0]).toMatchObject({ content: "Nice post" });
    expect(add.body[0].author.name).toBe("Bob");
    const commentId = add.body[0]._id;

    const del = (t) => request(app).delete(`${url}/${commentId}`).set(bearer(t));
    expect((await del(alice.token)).status).toBe(403);
    const ok = await del(bob.token);
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveLength(0);
    expect((await del(bob.token)).status).toBe(404);
  });
});

describe("users", () => {
  it("profile access rules and validation", async () => {
    const alice = await register();
    const bob = await register("Bob", "bob@example.com");

    const own = await request(app)
      .get(`/api/users/${alice.user._id}`)
      .set(bearer(alice.token));
    expect(own.body.email).toBe("alice@example.com");
    const other = await request(app)
      .get(`/api/users/${alice.user._id}`)
      .set(bearer(bob.token));
    expect(other.body.email).toBeUndefined();
    expect(other.body.name).toBe("Alice");

    const put = (t, body) =>
      request(app)
        .put(`/api/users/${alice.user._id}`)
        .set(bearer(t))
        .send(body);
    expect((await put(bob.token, { name: "Hax" })).status).toBe(403);
    expect((await put(alice.token, { name: "A" })).status).toBe(400);
    const upd = await put(alice.token, { name: "Alice B", bio: "hello" });
    expect(upd.body).toMatchObject({ name: "Alice B", bio: "hello" });
    expect(upd.body.password).toBeUndefined();

    await makePost(alice.token);
    const mine = await request(app)
      .get(`/api/users/${alice.user._id}/posts`)
      .set(bearer(alice.token));
    expect(mine.body).toHaveLength(1);
    expect(
      (
        await request(app)
          .get(`/api/users/${alice.user._id}/posts`)
          .set(bearer(bob.token))
      ).status
    ).toBe(403);
  });
});

describe("chat proxy", () => {
  const send = (body) => request(app).post("/api/chat").send(body);

  it("validates the payload", async () => {
    expect((await send({})).status).toBe(400);
    expect(
      (await send({ messages: [{ role: "system", content: "x" }] })).status
    ).toBe(400);
    expect(
      (await send({ messages: [{ role: "user", content: "x".repeat(5000) }] }))
        .status
    ).toBe(400);
  });

  it("forwards to Groq with the server-side key and returns the reply", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: " Hi there " } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await send({ messages: [{ role: "user", content: "hello" }] });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Hi there");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("api.groq.com");
    expect(opts.headers.Authorization).toBe("Bearer test-key");
    const sent = JSON.parse(opts.body);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[1]).toEqual({ role: "user", content: "hello" });
  });

  it("returns 502 without leaking upstream details when Groq fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "bad key" }),
      })
    );
    const res = await send({ messages: [{ role: "user", content: "hello" }] });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain("bad key");
  });
});

describe("app", () => {
  it("serves health, JSON 404, security headers and rejects bad JSON", async () => {
    const root = await request(app).get("/");
    expect(root.status).toBe(200);
    expect(root.headers["x-content-type-options"]).toBe("nosniff");
    const nf = await request(app).get("/api/nope");
    expect(nf.status).toBe(404);
    expect(nf.body.message).toBeTruthy();
    const bad = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{oops");
    expect(bad.status).toBe(400);
  });
});
