import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Home from "../pages/Home";
import BlogPost from "../pages/BlogPost";
import Profile from "../pages/Profile";
import AuthorPage from "../pages/AuthorPage";
import CreatePost from "../pages/CreatePost";
import EditPost from "../pages/EditPost";
import Bookmarks from "../pages/Bookmarks";
import PostCard from "../components/posts/PostCard";
import Navbar from "../components/layout/Navbar";
import ChatBot from "../components/ChatBot";
import usePageTitle, { toDescription } from "../hooks/usePageTitle";
import { toast } from "react-hot-toast";

vi.mock("axios");
vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const me = { _id: "u1", name: "Me", email: "me@x.io" };
const authed = { user: me, token: "tok", isAuthenticated: true, isLoading: false };
const anon = { user: null, token: null, isAuthenticated: false, isLoading: false };
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderAt = (path, routePath, element, ctx = authed) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={ctx}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );

const mkPost = (n, extra = {}) => ({
  _id: `p${n}`,
  title: `Post ${n}`,
  content: `Content ${n}`,
  tags: [],
  likes: [],
  comments: [],
  author: { _id: "u2", name: "Other" },
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const never = () => new Promise(() => {});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.confirm = vi.fn(() => true);
});

describe("skeleton loaders", () => {
  it("Home shows a post-list skeleton while loading", () => {
    axios.get.mockImplementation(never);
    renderAt("/", "/", <Home />);
    expect(screen.getByRole("status", { name: "Loading posts" })).toBeInTheDocument();
    expect(screen.getAllByTestId("post-card-skeleton").length).toBeGreaterThan(0);
  });

  it("post page, profile and author page show skeletons", () => {
    axios.get.mockImplementation(never);
    const a = renderAt("/post/p1", "/post/:id", <BlogPost />);
    expect(screen.getByRole("status", { name: "Loading post" })).toBeInTheDocument();
    a.unmount();
    const b = renderAt("/profile", "/profile", <Profile />);
    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
    b.unmount();
    renderAt("/u/u2", "/u/:id", <AuthorPage />);
    expect(screen.getByRole("status", { name: "Loading author" })).toBeInTheDocument();
  });

  it("the skeleton is replaced by content once loaded", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags")
        ? { data: [] }
        : { data: { posts: [mkPost(1)], page: 1, pages: 1, total: 1 } }
    );
    renderAt("/", "/", <Home />);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading posts" })).not.toBeInTheDocument();
  });
});

describe("drafts", () => {
  it("creating with 'Save as draft' sends status=draft and says so", async () => {
    axios.post.mockResolvedValue({ data: {} });
    renderAt("/create", "/create", <CreatePost />);
    await userEvent.type(screen.getByLabelText("Title"), "WIP");
    await userEvent.type(screen.getByLabelText("Content"), "later");
    await userEvent.click(screen.getByLabelText("Save as draft"));
    await userEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1]).toMatchObject({ status: "draft" });
    expect(toast.success).toHaveBeenCalledWith("Draft saved!");
  });

  it("a normal post is published and gets the regular toast", async () => {
    axios.post.mockResolvedValue({ data: {} });
    renderAt("/create", "/create", <CreatePost />);
    await userEvent.type(screen.getByLabelText("Title"), "Done");
    await userEvent.type(screen.getByLabelText("Content"), "body");
    await userEvent.click(screen.getByRole("button", { name: "Create Post" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].status).toBe("published");
    expect(toast.success).toHaveBeenCalledWith("Post created successfully!");
  });

  it("editing a draft prefills the checkbox and can publish it", async () => {
    axios.get.mockResolvedValue({
      data: mkPost(1, { author: { _id: "u1", name: "Me" }, status: "draft" }),
    });
    axios.put.mockResolvedValue({ data: {} });
    renderAt("/edit/p1", "/edit/:id", <EditPost />);
    const box = await screen.findByLabelText("Save as draft");
    expect(box).toBeChecked();
    await userEvent.click(box);
    await userEvent.click(screen.getByRole("button", { name: "Update Post" }));
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1].status).toBe("published");
  });

  it("shows a Draft badge on draft posts only", () => {
    const { unmount } = renderAt("/", "/", <PostCard post={mkPost(1, { status: "draft" })} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    unmount();
    renderAt("/", "/", <PostCard post={mkPost(2, { status: "published" })} />);
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });
});

describe("bookmarks", () => {
  it("PostCard toggles a bookmark through the API", async () => {
    axios.post.mockResolvedValue({ data: { bookmarked: true } });
    const onChange = vi.fn();
    renderAt("/", "/", <PostCard post={mkPost(1)} onBookmarkChange={onChange} />);
    const btn = screen.getByRole("button", { name: "Bookmark post" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true")
    );
    expect(axios.post).toHaveBeenCalledWith("/api/posts/p1/bookmark");
    expect(onChange).toHaveBeenCalledWith("p1", true);
  });

  it("starts bookmarked from the server flag", () => {
    renderAt("/", "/", <PostCard post={mkPost(1, { isBookmarkedByCurrentUser: true })} />);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reverts and shows the server message when the request fails", async () => {
    axios.post.mockRejectedValue({ response: { data: { message: "Post not found" } } });
    renderAt("/", "/", <PostCard post={mkPost(1)} />);
    await userEvent.click(screen.getByRole("button", { name: "Bookmark post" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Post not found"));
    expect(screen.getByRole("button", { name: "Bookmark post" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sends anonymous users to /login instead of calling the API", async () => {
    renderAt("/", "/", <PostCard post={mkPost(1)} />, anon);
    await userEvent.click(screen.getByRole("button", { name: "Bookmark post" }));
    expect(axios.post).not.toHaveBeenCalled();
    expect(await screen.findByTestId("where")).toHaveTextContent("/login");
  });

  it("post page bookmark toggles and reflects the server flag", async () => {
    axios.get.mockResolvedValue({ data: mkPost(1, { isBookmarkedByCurrentUser: true }) });
    axios.post.mockResolvedValue({ data: { bookmarked: false } });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    const btn = await screen.findByRole("button", { name: /bookmarked/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(btn);
    expect(await screen.findByRole("button", { name: /^bookmark$/i })).toHaveAttribute("aria-pressed", "false");
    expect(axios.post).toHaveBeenCalledWith("/api/posts/p1/bookmark");
  });

  it("Bookmarks page lists posts and removes one when un-bookmarked", async () => {
    axios.get.mockResolvedValue({ data: [mkPost(1), mkPost(2)] });
    axios.post.mockResolvedValue({ data: { bookmarked: false } });
    renderAt("/bookmarks", "/bookmarks", <Bookmarks />);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/posts/bookmarks");
    await userEvent.click(screen.getAllByRole("button", { name: "Remove bookmark" })[0]);
    await waitFor(() => expect(screen.queryByText("Post 1")).not.toBeInTheDocument());
    expect(screen.getByText("Post 2")).toBeInTheDocument();
  });

  it("Bookmarks page empty and error (with retry) states", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    const { unmount } = renderAt("/bookmarks", "/bookmarks", <Bookmarks />);
    expect(await screen.findByText(/haven't bookmarked any posts/i)).toBeInTheDocument();
    unmount();

    axios.get.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ data: [mkPost(7)] });
    renderAt("/bookmarks", "/bookmarks", <Bookmarks />);
    expect(await screen.findByText(/failed to load your bookmarks/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Post 7")).toBeInTheDocument();
  });

  it("Navbar links to /bookmarks for members only", () => {
    const nav = (ctx) =>
      render(
        <MemoryRouter>
          <AuthContext.Provider value={ctx}>
            <Navbar />
          </AuthContext.Provider>
        </MemoryRouter>
      );
    const a = nav({ ...authed, logout: vi.fn() });
    expect(screen.getByRole("link", { name: /bookmarks/i })).toHaveAttribute("href", "/bookmarks");
    a.unmount();
    nav(anon);
    expect(screen.queryByRole("link", { name: /bookmarks/i })).not.toBeInTheDocument();
  });

  it("mobile menu also has the Bookmarks link", async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ ...authed, logout: vi.fn() }}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );
    // desktop link + (after opening the menu) the mobile link
    expect(screen.getAllByRole("link", { name: /bookmarks/i })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getAllByRole("link", { name: /bookmarks/i })).toHaveLength(2);
  });
});

describe("SEO meta", () => {
  const Page = ({ title, description }) => {
    usePageTitle(title, description);
    return null;
  };
  const meta = (attr, key) => document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute("content");

  it("sets title, description, og and twitter tags", () => {
    render(<Page title="My post" description="# Hello **world**, this is the body" />);
    expect(document.title).toBe("My post | Panini8 Blog");
    expect(meta("name", "description")).toBe("Hello world , this is the body");
    expect(meta("property", "og:title")).toBe("My post | Panini8 Blog");
    expect(meta("property", "og:description")).toBe("Hello world , this is the body");
    expect(meta("name", "twitter:title")).toBe("My post | Panini8 Blog");
  });

  it("updates in place (no duplicate tags) and falls back to defaults", () => {
    const { rerender } = render(<Page title="A" description="first" />);
    rerender(<Page title="B" />);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.title).toBe("B | Panini8 Blog");
    expect(meta("name", "description")).toMatch(/community blogging platform/);
  });

  it("toDescription strips HTML/Markdown and truncates to 160 chars", () => {
    expect(toDescription("<script>x</script>**bold** text")).not.toMatch(/[<>*]/);
    const long = toDescription("word ".repeat(100));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("...")).toBe(true);
    expect(toDescription("")).toMatch(/community blogging platform/);
  });
});

describe("ChatBot mobile polish", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("is a labelled dialog with an aria-live message log", () => {
    render(<ChatBot isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Chat with Bot" })).toBeInTheDocument();
    const log = screen.getByRole("log", { name: "Chat messages" });
    expect(log).toHaveAttribute("aria-live", "polite");
  });

  it("focuses the input when opened", async () => {
    const { rerender } = render(<ChatBot isOpen={false} onClose={vi.fn()} />);
    rerender(<ChatBot isOpen onClose={vi.fn()} />);
    expect(screen.getByLabelText("Type your message")).toHaveFocus();
  });

  it("Escape closes the chat, but only while open", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<ChatBot isOpen onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<ChatBot isOpen={false} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses a full-width bottom sheet on small screens with safe-area padding", () => {
    render(<ChatBot isOpen onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/\bw-full\b/);
    expect(dialog.className).toMatch(/safe-area-inset-bottom/);
    expect(dialog.parentElement.className).toMatch(/inset-x-0/);
    expect(dialog.parentElement.className).toMatch(/bottom-0/);
  });
});
