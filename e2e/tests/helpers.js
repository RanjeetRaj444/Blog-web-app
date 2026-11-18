const { expect } = require("@playwright/test");

const PASSWORD = "password123";
let counter = 0;
const uniqueEmail = (prefix = "user") =>
  `${prefix}${Date.now()}${counter++}@e2e.test`;

async function register(page, { name = "E2E User", email = uniqueEmail() } = {}) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: /logout/i }).first()).toBeVisible();
  return { name, email };
}

async function login(page, email, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
}

async function createPost(page, { title, content, tags = [] }) {
  await page.goto("/create");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Content").fill(content);
  for (const tag of tags) {
    await page.getByLabel("Tags").fill(tag);
    await page.getByLabel("Tags").press("Enter");
  }
  await page.getByRole("button", { name: "Create Post" }).click();
  await expect(page).toHaveURL("/");
}

module.exports = { PASSWORD, uniqueEmail, register, login, createPost };
