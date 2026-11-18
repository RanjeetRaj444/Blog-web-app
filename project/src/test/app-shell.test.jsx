import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import App from "../App";

vi.mock("axios");
vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  axios.get.mockImplementation(async (url) =>
    url.endsWith("/tags")
      ? { data: [] }
      : { data: { posts: [], page: 1, pages: 0, total: 0 } }
  );
  window.history.pushState({}, "", "/");
});

describe("App shell", () => {
  it("renders the home route with skip link, landmark and chat button", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Panini8 Blog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute(
      "href",
      "#main-content"
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("button", { name: /chat with bot/i })).toBeInTheDocument();
  });

  it("opens and closes the chat widget", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /chat with bot/i }));
    expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /close chat/i }));
    expect(screen.queryByPlaceholderText(/type your message/i)).not.toBeInTheDocument();
  });

  it("shows the 404 page for unknown routes", async () => {
    window.history.pushState({}, "", "/no/such/page");
    render(<App />);
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
  });

  it("redirects anonymous users from protected routes to login", async () => {
    window.history.pushState({}, "", "/create");
    render(<App />);
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("routes to the public author page", async () => {
    window.history.pushState({}, "", "/u/abc");
    axios.get.mockRejectedValue({ response: { status: 404 } });
    render(<App />);
    expect(await screen.findByText("Author not found")).toBeInTheDocument();
  });
});
