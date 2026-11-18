const { test, expect } = require("@playwright/test");
const { register, login, createPost, uniqueEmail } = require("./helpers");

test.describe.serial("full user journey", () => {
  let page;
  let user;
  const title = `Journey post ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("register, create a post with tags, see it on Home", async () => {
    user = await register(page, { name: "Journey User" });
    await createPost(page, { title, content: "Hello from e2e", tags: ["e2e", "playwright"] });
    const card = page.locator("article", { hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByText("e2e", { exact: true })).toBeVisible();
    await expect(card.getByText("playwright", { exact: true })).toBeVisible();
  });

  test("like it: count changes and persists after reload", async () => {
    await page.goto("/");
    const card = page.locator("article", { hasText: title });
    const like = card.getByRole("button", { name: /like post/i });
    await expect(like).toHaveText("0");
    await like.click();
    await expect(card.getByRole("button", { name: /unlike post/i })).toHaveText("1");
    await page.reload();
    const after = page.locator("article", { hasText: title }).getByRole("button", { name: /unlike post/i });
    await expect(after).toHaveText("1");
    await expect(after).toHaveAttribute("aria-pressed", "true");
  });

  test("open the post, add a comment, then delete it", async () => {
    await page.locator("article", { hasText: title }).getByRole("heading", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await page.getByRole("button", { name: /write a comment/i }).click();
    await page.getByPlaceholder(/share your thoughts/i).fill("Nice e2e comment");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Nice e2e comment")).toBeVisible();
    await expect(page.getByText("Comments (1)")).toBeVisible();
    await page.getByTitle("Delete comment").click();
    await expect(page.getByText("Nice e2e comment")).toHaveCount(0);
    await expect(page.getByText("Comments (0)")).toBeVisible();
  });

  test("edit the post", async () => {
    await page.getByRole("link", { name: /edit post/i }).click();
    const input = page.getByLabel("Title");
    await expect(input).toHaveValue(title);
    await input.fill(`${title} (edited)`);
    await page.getByRole("button", { name: "Update Post" }).click();
    await expect(page.getByRole("heading", { level: 1, name: `${title} (edited)` })).toBeVisible();
  });

  test("profile shows stats", async () => {
    await page.goto("/profile");
    await expect(page.getByText("Journey User").first()).toBeVisible();
    const stats = page.getByText("Stats").locator("..");
    await expect(stats.getByText("Posts", { exact: true }).locator("xpath=following-sibling::*")).toHaveText("1");
    await expect(stats.getByText("Likes received").locator("xpath=following-sibling::*")).toHaveText("1");
    await expect(page.locator("article", { hasText: `${title} (edited)` })).toBeVisible();
  });

  test("logout, then login again", async () => {
    await page.getByRole("button", { name: /logout/i }).first().click();
    await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();
    await login(page, user.email);
    await expect(page.getByRole("button", { name: /logout/i }).first()).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("search finds the post and misses unrelated terms", async () => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: "Search posts" });
    await search.fill("edited");
    await expect(page.locator("article", { hasText: title })).toBeVisible();
    await search.fill("zzz-no-such-post");
    await expect(page.getByText(/no posts match/i)).toBeVisible();
    await expect(page.locator("article", { hasText: title })).toHaveCount(0);
  });
});

test("anonymous visitor clicking like is sent to /login", async ({ page, browser }) => {
  const owner = await browser.newPage();
  await register(owner, { name: "Owner" });
  const t = `Anon like ${Date.now()}`;
  await createPost(owner, { title: t, content: "body" });
  await owner.close();

  await page.goto("/");
  await page.locator("article", { hasText: t }).getByRole("button", { name: /like post/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows an error and stays on login", async ({ page }) => {
  const { email } = await register(page);
  await page.getByRole("button", { name: /logout/i }).first().click();
  await login(page, email, "wrong-password");
  await expect(page.getByText("Invalid credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("registering the same email twice is rejected", async ({ page }) => {
  const email = uniqueEmail("dup");
  await register(page, { email });
  await page.getByRole("button", { name: /logout/i }).first().click();
  await page.goto("/register");
  await page.getByLabel("Name").fill("Dup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByText("User already exists")).toBeVisible();
});

test("chatbot opens, sends a message and shows the stubbed reply", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chat with Bot" }).click();
  await page.getByPlaceholder("Type your message...").fill("Hello bot");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello bot")).toBeVisible();
  await expect(page.getByText("Stubbed bot reply")).toBeVisible();
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByPlaceholder("Type your message...")).toHaveCount(0);
});

test("unauthenticated /create redirects to /login", async ({ page }) => {
  await page.goto("/create");
  await expect(page).toHaveURL(/\/login$/);
});

test("unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/definitely/not/a/page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText("Page not found").first()).toBeVisible();
});
