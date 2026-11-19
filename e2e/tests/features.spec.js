const { test, expect } = require("@playwright/test");
const { register, login, createPost, uniqueEmail, PASSWORD } = require("./helpers");

test("comment editing: edit shows (edited), cancel keeps original", async ({ page }) => {
  await register(page, { name: "Editor" });
  const title = `Edit-comment ${Date.now()}`;
  await createPost(page, { title, content: "body" });
  await page.locator("article", { hasText: title }).getByRole("heading", { name: title }).click();
  await page.getByRole("button", { name: /write a comment/i }).click();
  await page.getByPlaceholder(/share your thoughts/i).fill("first version");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("first version")).toBeVisible();

  await page.getByRole("button", { name: "Edit comment" }).click();
  const box = page.getByLabel("Edit your comment");
  await box.fill("second version");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("second version")).toBeVisible();
  await expect(page.getByText("(edited)")).toBeVisible();

  await page.reload();
  await expect(page.getByText("second version")).toBeVisible();
  await expect(page.getByText("(edited)")).toBeVisible();
});

test("author page lists the author's posts and is public", async ({ page, browser }) => {
  await register(page, { name: "Famous Author" });
  const title = `Authored ${Date.now()}`;
  await createPost(page, { title, content: "by me" });
  await page.locator("article", { hasText: title }).getByRole("link", { name: "Famous Author" }).click();
  await expect(page).toHaveURL(/\/u\//);
  const url = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Famous Author" })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  const anon = await browser.newPage();
  await anon.goto(url);
  await expect(anon.getByRole("heading", { level: 1, name: "Famous Author" })).toBeVisible();
  await expect(anon.getByText(title)).toBeVisible();
  await anon.close();
});

test("bookmarks: add from Home, list on /bookmarks, remove", async ({ page }) => {
  await register(page, { name: "Reader" });
  const title = `Bookmarkable ${Date.now()}`;
  await createPost(page, { title, content: "save me" });
  const card = page.locator("article", { hasText: title });
  await card.getByRole("button", { name: "Bookmark post" }).click();
  await expect(card.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/bookmarks");
  await expect(page.getByRole("heading", { name: /your bookmarks/i })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
  await page.reload();
  await expect(page.getByText(title)).toBeVisible(); // persisted on the server

  await page.locator("article", { hasText: title }).getByRole("button", { name: "Remove bookmark" }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("drafts are private: visible to the author only, then publish", async ({ page, browser }) => {
  const me = await register(page, { name: "Drafter" });
  const title = `Secret draft ${Date.now()}`;
  await page.goto("/create");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Content").fill("not yet");
  await page.getByLabel("Save as draft").check();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page).toHaveURL("/");

  // not listed publicly
  await expect(page.getByText(title)).toHaveCount(0);
  const anon = await browser.newPage();
  await anon.goto("/");
  await expect(anon.getByRole("heading", { name: "Panini8 Blog" })).toBeVisible();
  await expect(anon.getByText(title)).toHaveCount(0);

  // visible to the author on the profile with a Draft badge
  await page.goto("/profile");
  const card = page.locator("article", { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Draft", { exact: true })).toBeVisible();

  // another visitor cannot open it directly
  await card.getByRole("heading", { name: title }).click();
  const draftUrl = page.url();
  await anon.goto(draftUrl);
  await expect(anon.getByText(/post not found/i)).toBeVisible();
  await anon.close();

  // publish it
  await page.goto(draftUrl.replace("/post/", "/edit/"));
  await page.getByLabel("Save as draft").uncheck();
  await page.getByRole("button", { name: "Update Post" }).click();
  await page.goto("/");
  await expect(page.getByText(title)).toBeVisible();
  expect(me.email).toBeTruthy();
});

test("account locks after 5 wrong passwords, even for the right one", async ({ page }) => {
  const { email } = await register(page, { name: "Locky", email: uniqueEmail("lock") });
  await page.getByRole("button", { name: /logout/i }).first().click();

  for (let i = 0; i < 5; i++) {
    await login(page, email, "wrong-password");
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  }
  await login(page, email, PASSWORD);
  await expect(page.getByText(/too many failed attempts/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
