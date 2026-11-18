import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Home from "../pages/Home";
import BlogPost from "../pages/BlogPost";
import CreatePost from "../pages/CreatePost";
import EditPost from "../pages/EditPost";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import NotFound from "../pages/NotFound";
import Navbar from "../components/layout/Navbar";
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
  tags: ["react"],
  likes: [],
  comments: [],
  author: { _id: "u2", name: "Other" },
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.confirm = vi.fn(() => true);
});

describe("Home", () => {
  it("lists posts, sends the token only when logged in", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags")
        ? { data: ["react"] }
        : { data: { posts: [mkPost(1), mkPost(2)], page: 1, pages: 1, total: 2 } }
    );
    const { unmount } = renderAt("/", "/", <Home />);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.getByText("Post 2")).toBeInTheDocument();
    const postsCall = axios.get.mock.calls.find(([u]) => u.endsWith("/api/posts"));
    expect(postsCall[1].headers.Authorization).toBe("Bearer tok");
    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
    unmount();

    axios.get.mockClear();
    renderAt("/", "/", <Home />, anon);
    await screen.findByText("Post 1");
    const anonCall = axios.get.mock.calls.find(([u]) => u.endsWith("/api/posts"));
    expect(anonCall[1].headers.Authorization).toBeUndefined();
  });

  it("loads more pages without duplicating posts", async () => {
    axios.get.mockImplementation(async (url, opts) => {
      if (url.endsWith("/tags")) return { data: [] };
      return opts.params.page === 1
        ? { data: { posts: [mkPost(1)], page: 1, pages: 2, total: 2 } }
        : { data: { posts: [mkPost(1), mkPost(2)], page: 2, pages: 2, total: 2 } };
    });
    renderAt("/", "/", <Home />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Post 2")).toBeInTheDocument();
    expect(screen.getAllByText("Post 1")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("filters by tag using the server", async () => {
    axios.get.mockImplementation(async (url, opts) => {
      if (url.endsWith("/tags")) return { data: ["react", "node"] };
      return opts.params.tag === "node"
        ? { data: { posts: [mkPost(9, { tags: ["node"] })], page: 1, pages: 1, total: 1 } }
        : { data: { posts: [mkPost(1)], page: 1, pages: 1, total: 1 } };
    });
    renderAt("/", "/", <Home />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByRole("button", { name: /filter by tag/i }));
    await userEvent.click(await screen.findByRole("button", { name: "node" }));
    expect(await screen.findByText("Post 9")).toBeInTheDocument();
    expect(screen.queryByText("Post 1")).not.toBeInTheDocument();
  });

  it("shows empty and error states", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags") ? { data: [] } : { data: { posts: [], page: 1, pages: 0, total: 0 } }
    );
    const { unmount } = renderAt("/", "/", <Home />);
    expect(await screen.findByText(/no posts found/i)).toBeInTheDocument();
    unmount();
    axios.get.mockRejectedValue(new Error("down"));
    renderAt("/", "/", <Home />);
    expect(await screen.findByText(/failed to fetch posts/i)).toBeInTheDocument();
  });

  it("likes a post through the API and lets the author delete theirs", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags")
        ? { data: [] }
        : { data: { posts: [mkPost(1), mkPost(2, { author: { _id: "u1", name: "Me" } })], page: 1, pages: 1, total: 2 } }
    );
    axios.post.mockResolvedValue({ data: ["u1"] });
    axios.delete.mockResolvedValue({ data: {} });
    renderAt("/", "/", <Home />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getAllByRole("button", { name: /like post/i })[0]);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/posts/p1/like"),
      {},
      { headers: { Authorization: "Bearer tok" } }
    );
    expect(screen.getAllByLabelText("Delete post")).toHaveLength(1); // only own post
    await userEvent.click(screen.getByLabelText("Delete post"));
    await waitFor(() => expect(screen.queryByText("Post 2")).not.toBeInTheDocument());
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining("/api/posts/p2"),
      expect.any(Object)
    );
  });
});

describe("BlogPost", () => {
  const full = (extra = {}) =>
    mkPost(1, { content: "Line one\n\nLine two", likes: [], comments: [], ...extra });

  it("renders the post, paragraphs and tags", async () => {
    axios.get.mockResolvedValue({ data: full() });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    expect(await screen.findByRole("heading", { name: "Post 1" })).toBeInTheDocument();
    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Line two")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.queryByText(/edit post/i)).not.toBeInTheDocument();
  });

  it("shows 'Post not found' on 404 and a generic error otherwise", async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    const { unmount } = renderAt("/post/x", "/post/:id", <BlogPost />);
    expect(await screen.findByText("Post not found")).toBeInTheDocument();
    unmount();
    axios.get.mockRejectedValueOnce(new Error("net"));
    renderAt("/post/x", "/post/:id", <BlogPost />);
    expect(await screen.findByText(/failed to load post/i)).toBeInTheDocument();
  });

  it("owner sees Edit link", async () => {
    axios.get.mockResolvedValue({ data: full({ author: { _id: "u1", name: "Me" } }) });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    expect(await screen.findByText("Edit Post")).toBeInTheDocument();
  });

  it("toggles like using the server's likes list", async () => {
    axios.get.mockResolvedValue({ data: full() });
    axios.post.mockResolvedValueOnce({ data: ["u1"] }).mockResolvedValueOnce({ data: [] });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    await screen.findByRole("heading", { name: "Post 1" });
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    expect(await screen.findByText("Liked")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /liked/i }));
    expect(await screen.findByText("Like")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });

  it("redirects anonymous users who try to like", async () => {
    axios.get.mockResolvedValue({ data: full() });
    renderAt("/post/p1", "/post/:id", <BlogPost />, anon);
    await screen.findByRole("heading", { name: "Post 1" });
    await userEvent.click(screen.getByRole("button", { name: /^like/i }));
    expect(axios.post).not.toHaveBeenCalled();
    expect(await screen.findByTestId("where")).toHaveTextContent("/login");
  });

  it("adds and deletes a comment end to end", async () => {
    const comment = {
      _id: "c1",
      content: "Great read",
      author: { _id: "u1", name: "Me" },
      createdAt: "2026-01-01T00:00:00Z",
    };
    axios.get.mockResolvedValue({ data: full() });
    axios.post.mockResolvedValue({ data: [comment] });
    axios.delete.mockResolvedValue({ data: [] });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    await screen.findByRole("heading", { name: "Post 1" });
    await userEvent.click(screen.getByRole("button", { name: /write a comment/i }));
    await userEvent.type(screen.getByPlaceholderText(/share your thoughts/i), "Great read");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText("Great read")).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/posts/p1/comments"),
      { content: "Great read" },
      { headers: { Authorization: "Bearer tok" } }
    );
    await userEvent.click(screen.getByTitle("Delete comment"));
    await waitFor(() => expect(screen.queryByText("Great read")).not.toBeInTheDocument());
  });

  it("shows the server's message when commenting fails", async () => {
    axios.get.mockResolvedValue({ data: full() });
    axios.post.mockRejectedValue({ response: { data: { message: "Comment limit reached for this post" } } });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    await screen.findByRole("heading", { name: "Post 1" });
    await userEvent.click(screen.getByRole("button", { name: /write a comment/i }));
    await userEvent.type(screen.getByPlaceholderText(/share your thoughts/i), "hi");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Comment limit reached for this post")
    );
  });
});

describe("CreatePost", () => {
  it("validates, then submits title, content and tags with the token", async () => {
    axios.post.mockResolvedValue({ data: {} });
    renderAt("/create", "/create", <CreatePost />);
    await userEvent.click(screen.getByRole("button", { name: /create post/i }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Title"), "Hello");
    await userEvent.type(screen.getByLabelText("Content"), "World");
    await userEvent.type(screen.getByLabelText("Tags"), "js{Enter}");
    await userEvent.type(screen.getByLabelText("Tags"), "js{Enter}"); // duplicate ignored
    await userEvent.type(screen.getByLabelText("Tags"), "node{Enter}");
    await userEvent.click(screen.getByRole("button", { name: /create post/i }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const [url, body, opts] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/api\/posts$/);
    expect(body).toEqual({ title: "Hello", content: "World", tags: ["js", "node"] });
    expect(opts.headers.Authorization).toBe("Bearer tok");
    expect(toast.success).toHaveBeenCalled();
    expect(await screen.findByTestId("where")).toHaveTextContent("/");
  });

  it("shows the server error and stays on the page", async () => {
    axios.post.mockRejectedValue({ response: { data: { message: "Title is required (max 150 characters)" } } });
    renderAt("/create", "/create", <CreatePost />);
    await userEvent.type(screen.getByLabelText("Title"), "T");
    await userEvent.type(screen.getByLabelText("Content"), "C");
    await userEvent.click(screen.getByRole("button", { name: /create post/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Title is required (max 150 characters)"));
    expect(screen.queryByTestId("where")).not.toBeInTheDocument();
  });
});

describe("EditPost", () => {
  const own = mkPost(1, { author: { _id: "u1", name: "Me" }, tags: ["a"] });

  it("prefills, updates and navigates back to the post", async () => {
    axios.get.mockResolvedValue({ data: own });
    axios.put.mockResolvedValue({ data: {} });
    renderAt("/edit/p1", "/edit/:id", <EditPost />);
    const title = await screen.findByLabelText("Title");
    expect(title).toHaveValue("Post 1");
    await userEvent.clear(title);
    await userEvent.type(title, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: /update post/i }));
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1]).toEqual({ title: "Renamed", content: "Content 1", tags: ["a"] });
    expect(await screen.findByTestId("where")).toHaveTextContent("/post/p1");
  });

  it("blocks non-authors", async () => {
    axios.get.mockResolvedValue({ data: mkPost(1) });
    renderAt("/edit/p1", "/edit/:id", <EditPost />);
    expect(await screen.findByText(/only edit your own posts/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("deletes after confirmation and respects cancel", async () => {
    axios.get.mockResolvedValue({ data: own });
    axios.delete.mockResolvedValue({ data: {} });
    renderAt("/edit/p1", "/edit/:id", <EditPost />);
    await screen.findByLabelText("Title");
    window.confirm = vi.fn(() => false);
    await userEvent.click(screen.getByRole("button", { name: /delete post/i }));
    expect(axios.delete).not.toHaveBeenCalled();
    window.confirm = vi.fn(() => true);
    await userEvent.click(screen.getByRole("button", { name: /delete post/i }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(await screen.findByTestId("where")).toHaveTextContent("/");
  });

  it("shows not found for a missing post", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 } });
    renderAt("/edit/zz", "/edit/:id", <EditPost />);
    expect(await screen.findByText("Post not found")).toBeInTheDocument();
  });
});

describe("Profile", () => {
  const mine = [
    mkPost(1, { author: { _id: "u1", name: "Me" }, likes: ["a", "b"], comments: [{}] }),
    mkPost(2, { author: { _id: "u1", name: "Me" }, likes: ["a"] }),
  ];
  const setup = (posts = mine) =>
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/posts") ? { data: posts } : { data: { ...me, bio: "hello" } }
    );

  it("shows profile, stats and posts", async () => {
    setup();
    renderAt("/profile", "/profile", <Profile />);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    const stats = screen.getByText("Stats").parentElement;
    expect(within(stats).getByText("Likes received").nextSibling).toHaveTextContent("3");
    expect(within(stats).getByText("Comments received").nextSibling).toHaveTextContent("1");
    expect(within(stats).getByText("Posts").nextSibling).toHaveTextContent("2");
  });

  it("edits the profile", async () => {
    setup();
    axios.put.mockResolvedValue({ data: {} });
    renderAt("/profile", "/profile", <Profile />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByLabelText("Edit Profile"));
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1]).toEqual({ name: "New Name", bio: "hello" });
    expect(await screen.findByText("New Name")).toBeInTheDocument();
  });

  it("deletes a post and offers a link when there are none", async () => {
    setup();
    axios.delete.mockResolvedValue({ data: {} });
    renderAt("/profile", "/profile", <Profile />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getAllByLabelText("Delete post")[0]);
    await waitFor(() => expect(screen.queryByText("Post 1")).not.toBeInTheDocument());

    setup([]);
    renderAt("/profile", "/profile", <Profile />);
    const link = await screen.findByRole("link", { name: /create your first post/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("shows an error when loading fails", async () => {
    axios.get.mockRejectedValue(new Error("x"));
    renderAt("/profile", "/profile", <Profile />);
    expect(await screen.findByText(/failed to load profile/i)).toBeInTheDocument();
  });
});

describe("Register", () => {
  const fill = async (over = {}) => {
    const v = { name: "Bob", email: "bob@x.io", password: "secret12", confirm: "secret12", ...over };
    await userEvent.type(screen.getByLabelText("Name"), v.name);
    await userEvent.type(screen.getByLabelText("Email"), v.email);
    await userEvent.type(screen.getByLabelText("Password"), v.password);
    await userEvent.type(screen.getByLabelText("Confirm Password"), v.confirm);
    await userEvent.click(screen.getByRole("button", { name: "Register" }));
  };

  it("blocks mismatched passwords and short passwords", async () => {
    const register = vi.fn();
    renderAt("/register", "/register", <Register />, { ...anon, register });
    await fill({ confirm: "different" });
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers and goes home; shows server errors", async () => {
    const register = vi.fn().mockResolvedValue();
    const { unmount } = renderAt("/register", "/register", <Register />, { ...anon, register });
    await fill();
    await waitFor(() => expect(register).toHaveBeenCalledWith("Bob", "bob@x.io", "secret12"));
    expect(await screen.findByTestId("where")).toHaveTextContent("/");
    unmount();

    const failing = vi.fn().mockRejectedValue({ response: { data: { message: "User already exists" } } });
    renderAt("/register", "/register", <Register />, { ...anon, register: failing });
    await fill();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("User already exists"));
  });
});

describe("Navbar", () => {
  const renderNav = (ctx) =>
    render(
      <MemoryRouter>
        <AuthContext.Provider value={ctx}>
          <Navbar />
          <Where />
        </AuthContext.Provider>
      </MemoryRouter>
    );

  it("shows login/register when logged out", () => {
    renderNav(anon);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("shows member links and logs out without reloading the page", async () => {
    const logout = vi.fn();
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });
    renderNav({ ...authed, logout });
    expect(screen.getByRole("link", { name: /create post/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(logout).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/");
  });
});

describe("NotFound", () => {
  it("renders for unknown routes", () => {
    renderAt("/x", "/x", <NotFound />);
    expect(document.body.textContent).toMatch(/404|not found/i);
  });
});
