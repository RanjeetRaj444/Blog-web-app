import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import Home from "../pages/Home";
import BlogPost from "../pages/BlogPost";
import AuthorPage from "../pages/AuthorPage";
import Register from "../pages/Register";
import NotFound from "../pages/NotFound";
import PostForm from "../components/posts/PostForm";
import PostCard from "../components/posts/PostCard";
import CommentItem from "../components/comments/CommentItem";
import Markdown from "../components/ui/Markdown";
import ErrorBoundary from "../components/ErrorBoundary";
import usePageTitle from "../hooks/usePageTitle";
import { toast } from "react-hot-toast";

vi.mock("axios");
vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const me = { _id: "u1", name: "Me", email: "me@x.io" };
const authed = { user: me, token: "tok", isAuthenticated: true, isLoading: false };
const anon = { user: null, token: null, isAuthenticated: false, isLoading: false };

const renderAt = (path, routePath, element, ctx = authed) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={ctx}>
        <Routes>
          <Route path={routePath} element={element} />
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

const listResponse = (posts) => ({ data: { posts, page: 1, pages: 1, total: posts.length } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  document.title = "";
});

describe("Home search, sort and retry", () => {
  const postsCalls = () => axios.get.mock.calls.filter(([u]) => u.endsWith("/api/posts"));

  it("debounces search, sends q, and shows a search-specific empty state", async () => {
    axios.get.mockImplementation(async (url, opts) =>
      url.endsWith("/tags")
        ? { data: [] }
        : opts.params.q
        ? listResponse([])
        : listResponse([mkPost(1)])
    );
    renderAt("/", "/", <Home />);
    await screen.findByText("Post 1");
    const before = postsCalls().length;

    await userEvent.type(screen.getByLabelText("Search posts"), "docker");
    // typing 6 characters must not trigger 6 requests
    expect(postsCalls().length).toBe(before);
    expect(await screen.findByText('No posts match "docker".')).toBeInTheDocument();
    const last = postsCalls().at(-1)[1].params;
    expect(last).toMatchObject({ q: "docker", page: 1, sort: "newest" });
    expect(postsCalls().length).toBe(before + 1);
  });

  it("sends the chosen sort and resets to page 1", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags") ? { data: [] } : listResponse([mkPost(1)])
    );
    renderAt("/", "/", <Home />);
    await screen.findByText("Post 1");
    await userEvent.selectOptions(screen.getByLabelText("Sort posts"), "popular");
    await waitFor(() => expect(postsCalls().at(-1)[1].params.sort).toBe("popular"));
    expect(postsCalls().at(-1)[1].params.page).toBe(1);
    await userEvent.selectOptions(screen.getByLabelText("Sort posts"), "oldest");
    await waitFor(() => expect(postsCalls().at(-1)[1].params.sort).toBe("oldest"));
  });

  it("explains cold starts and retries on demand", async () => {
    axios.get.mockImplementation(async (url) => {
      if (url.endsWith("/tags")) return { data: [] };
      throw new Error("down");
    });
    renderAt("/", "/", <Home />);
    expect(await screen.findByText(/server may be waking up/i)).toBeInTheDocument();

    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags") ? { data: [] } : listResponse([mkPost(7)])
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Post 7")).toBeInTheDocument();
  });

  it("sets the page title", async () => {
    axios.get.mockImplementation(async (url) =>
      url.endsWith("/tags") ? { data: [] } : listResponse([])
    );
    renderAt("/", "/", <Home />);
    await waitFor(() => expect(document.title).toBe("Panini8 Blog"));
  });
});

describe("Markdown rendering", () => {
  it("renders markdown formatting", () => {
    render(<Markdown>{"# Title\n\n**bold** and a [link](https://example.com)"}</Markdown>);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("never turns raw HTML or scripts into elements", () => {
    const { container } = render(
      <Markdown>{'<script>window.__pwned = 1</script>\n\n<img src=x onerror="window.__pwned=1">\n\n<b>raw</b>'}</Markdown>
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(window.__pwned).toBeUndefined();
  });

  it("is used for post content on the post page", async () => {
    axios.get.mockResolvedValue({ data: mkPost(1, { content: "## Heading\n\n- one\n- two" }) });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    expect(await screen.findByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await waitFor(() => expect(document.title).toBe("Post 1 | Panini8 Blog"));
  });
});

describe("PostForm preview", () => {
  it("toggles between Write and Preview without losing content", async () => {
    render(<PostForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Content"), "**hi**");
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
    expect(screen.getByText("hi").tagName).toBe("STRONG");
    await userEvent.click(screen.getByRole("tab", { name: "Write" }));
    expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toHaveValue("**hi**");
  });

  it("shows a placeholder when empty and sanitises scripts in the preview", async () => {
    render(<PostForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Write" }));
    await userEvent.type(screen.getByLabelText("Content"), "<script>x</script>");
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByTestId("markdown-preview").querySelector("script")).toBeNull();
  });

  it("can remove a tag via its accessible button", async () => {
    render(<PostForm initialData={{ title: "t", content: "c", tags: ["a", "b"] }} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove tag a" }));
    expect(screen.queryByRole("button", { name: "Remove tag a" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag b" })).toBeInTheDocument();
  });
});

describe("comment editing", () => {
  const comment = {
    _id: "c1",
    content: "original",
    edited: false,
    author: { _id: "u1", name: "Me" },
    createdAt: "2026-01-01T00:00:00Z",
  };
  const renderItem = (props, ctx = authed) =>
    render(
      <AuthContext.Provider value={ctx}>
        <CommentItem comment={comment} onDelete={vi.fn()} {...props} />
      </AuthContext.Provider>
    );

  it("lets the author edit and save", async () => {
    const onEdit = vi.fn().mockResolvedValue();
    renderItem({ onEdit });
    await userEvent.click(screen.getByLabelText("Edit comment"));
    const box = screen.getByLabelText("Edit your comment");
    expect(box).toHaveValue("original");
    await userEvent.clear(box);
    await userEvent.type(box, "  updated  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith("c1", "updated");
    await waitFor(() => expect(screen.queryByLabelText("Edit your comment")).not.toBeInTheDocument());
  });

  it("keeps the editor open when saving fails, and cancel restores view", async () => {
    const onEdit = vi.fn().mockRejectedValue(new Error("x"));
    renderItem({ onEdit });
    await userEvent.click(screen.getByLabelText("Edit comment"));
    await userEvent.type(screen.getByLabelText("Edit your comment"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    expect(screen.getByLabelText("Edit your comment")).toHaveValue("original!");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("original")).toBeInTheDocument();
  });

  it("hides edit for non-authors, shows (edited) marker", () => {
    renderItem({ onEdit: vi.fn() }, { ...authed, user: { _id: "u9" } });
    expect(screen.queryByLabelText("Edit comment")).not.toBeInTheDocument();
  });

  it("shows (edited)", () => {
    render(
      <AuthContext.Provider value={authed}>
        <CommentItem comment={{ ...comment, edited: true }} onDelete={vi.fn()} />
      </AuthContext.Provider>
    );
    expect(screen.getByText("(edited)")).toBeInTheDocument();
  });

  it("works end to end on the post page via PUT", async () => {
    const own = { ...comment };
    axios.get.mockResolvedValue({ data: mkPost(1, { comments: [own] }) });
    axios.put.mockResolvedValue({ data: [{ ...own, content: "better", edited: true }] });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    await screen.findByText("original");
    await userEvent.click(screen.getByLabelText("Edit comment"));
    const box = screen.getByLabelText("Edit your comment");
    await userEvent.clear(box);
    await userEvent.type(box, "better");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("(edited)")).toBeInTheDocument();
    expect(screen.getByText(/better/)).toBeInTheDocument();
    expect(axios.put).toHaveBeenCalledWith(
      "/api/posts/p1/comments/c1",
      { content: "better" }
    );
  });

  it("toasts the server message when the PUT fails", async () => {
    axios.get.mockResolvedValue({ data: mkPost(1, { comments: [{ ...comment }] }) });
    axios.put.mockRejectedValue({ response: { data: { message: "User not authorized" } } });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    await screen.findByText("original");
    await userEvent.click(screen.getByLabelText("Edit comment"));
    await userEvent.type(screen.getByLabelText("Edit your comment"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("User not authorized"));
    expect(screen.getByLabelText("Edit your comment")).toBeInTheDocument();
  });
});

describe("author page and links", () => {
  it("renders the author profile and posts without auth", async () => {
    axios.get.mockResolvedValue({
      data: {
        user: { _id: "u2", name: "Other", bio: "I write", createdAt: "2026-03-01T00:00:00Z" },
        posts: [mkPost(1), mkPost(2)],
      },
    });
    renderAt("/u/u2", "/u/:id", <AuthorPage />, anon);
    expect(await screen.findByRole("heading", { name: "Other" })).toBeInTheDocument();
    expect(screen.getByText("I write")).toBeInTheDocument();
    expect(screen.getByText(/2 posts/)).toBeInTheDocument();
    expect(screen.getByText("Post 2")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/users\/u2\/public$/));
    await waitFor(() => expect(document.title).toBe("Other | Panini8 Blog"));
  });

  it("handles no posts, no bio, not found and generic errors", async () => {
    axios.get.mockResolvedValueOnce({
      data: { user: { _id: "u2", name: "Quiet", bio: "", createdAt: "2026-03-01T00:00:00Z" }, posts: [] },
    });
    const { unmount } = renderAt("/u/u2", "/u/:id", <AuthorPage />, anon);
    expect(await screen.findByText("No posts yet.")).toBeInTheDocument();
    expect(screen.getByText("No bio provided yet")).toBeInTheDocument();
    unmount();

    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    const second = renderAt("/u/zz", "/u/:id", <AuthorPage />, anon);
    expect(await screen.findByText("Author not found")).toBeInTheDocument();
    second.unmount();

    axios.get.mockRejectedValueOnce(new Error("net"));
    renderAt("/u/zz", "/u/:id", <AuthorPage />, anon);
    expect(await screen.findByText(/failed to load author/i)).toBeInTheDocument();
  });

  it("PostCard and BlogPost link the author name to /u/:id", async () => {
    const { unmount } = renderAt("/", "/", <PostCard post={mkPost(1)} />);
    expect(screen.getByRole("link", { name: "Other" })).toHaveAttribute("href", "/u/u2");
    unmount();

    axios.get.mockResolvedValue({ data: mkPost(1) });
    renderAt("/post/p1", "/post/:id", <BlogPost />);
    const link = await screen.findByRole("link", { name: "Other" });
    expect(link).toHaveAttribute("href", "/u/u2");
  });
});

describe("ErrorBoundary", () => {
  const Boom = () => {
    throw new Error("render crash");
  };

  it("renders children normally", () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("shows a friendly fallback with a reload button", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true });
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole("button", { name: /reload page/i }));
    expect(reload).toHaveBeenCalled();
  });
});

describe("usePageTitle and NotFound", () => {
  const T = ({ title }) => {
    usePageTitle(title);
    return null;
  };

  it("sets and updates the title, falling back to the site name", () => {
    const { rerender } = render(<T title="Hello" />);
    expect(document.title).toBe("Hello | Panini8 Blog");
    rerender(<T title="World" />);
    expect(document.title).toBe("World | Panini8 Blog");
    rerender(<T />);
    expect(document.title).toBe("Panini8 Blog");
  });

  it("NotFound sets its title", () => {
    renderAt("/x", "/x", <NotFound />);
    expect(document.title).toBe("Page not found | Panini8 Blog");
  });
});

describe("Register password policy", () => {
  it("requires at least 8 characters", async () => {
    const register = vi.fn();
    renderAt("/register", "/register", <Register />, { ...anon, register });
    await userEvent.type(screen.getByLabelText("Name"), "Bob");
    await userEvent.type(screen.getByLabelText("Email"), "bob@x.io");
    await userEvent.type(screen.getByLabelText("Password"), "1234567");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "1234567");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});

describe("401 interceptor", () => {
  it("logs out and toasts when an authenticated request returns 401", async () => {
    let onError;
    axios.interceptors = {
      response: {
        use: vi.fn((ok, bad) => {
          onError = bad;
          return 42;
        }),
        eject: vi.fn(),
      },
    };
    localStorage.setItem("token", "tok");
    axios.get.mockResolvedValue({ data: me });
    const Probe = () => (
      <AuthContext.Consumer>
        {(v) => <span data-testid="s">{v.isLoading ? "loading" : v.isAuthenticated ? "in" : "out"}</span>}
      </AuthContext.Consumer>
    );
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("in"));
    expect(axios.interceptors.response.use).toHaveBeenCalled();

    // anonymous-request 401s (no auth header sent) must not log the user out
    await act(async () => {
      await expect(onError({ response: { status: 401 }, config: { headers: {} } })).rejects.toBeTruthy();
    });
    expect(screen.getByTestId("s")).toHaveTextContent("in");

    // 500s do not log out either
    await act(async () => {
      await expect(onError({ response: { status: 500 }, config: { headers: { Authorization: "Bearer tok" } } })).rejects.toBeTruthy();
    });
    expect(screen.getByTestId("s")).toHaveTextContent("in");

    await act(async () => {
      await expect(onError({ response: { status: 401 }, config: { headers: { Authorization: "Bearer tok" } } })).rejects.toBeTruthy();
    });
    await waitFor(() => expect(screen.getByTestId("s")).toHaveTextContent("out"));
    expect(toast.error).toHaveBeenCalledWith("Session expired. Please log in again.");
    expect(localStorage.getItem("token")).toBeNull();
    expect(axios.interceptors.response.eject).toHaveBeenCalledWith(42);
    delete axios.interceptors;
  });
});
