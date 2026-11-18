import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import PostCard from "../components/posts/PostCard";
import CommentSection from "../components/comments/CommentSection";
import ChatBot from "../components/ChatBot";
import Login from "../pages/Login";
import ProtectedRoute from "../components/auth/ProtectedRoute";

vi.mock("axios");
vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));
import { toast } from "react-hot-toast";

const me = { _id: "u1", name: "Me", email: "me@x.io" };
const withAuth = (ui, value = {}) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user: me, token: "t", isAuthenticated: true, isLoading: false, ...value }}
      >
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );

const post = (extra = {}) => ({
  _id: "p1",
  title: "My title",
  content: "Body text",
  tags: ["react"],
  likes: [],
  comments: [],
  author: { _id: "u2", name: "Other" },
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("PostCard", () => {
  it("shows liked state from the server flag and count", () => {
    withAuth(<PostCard post={post({ likes: ["u1"], isLikedByCurrentUser: true })} onLike={vi.fn()} />);
    expect(screen.getByRole("button", { name: /unlike/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /unlike/i })).toHaveTextContent("1");
  });

  it("optimistically likes, and reverts when the request fails", async () => {
    const onLike = vi.fn().mockRejectedValue(new Error("boom"));
    withAuth(<PostCard post={post()} onLike={onLike} />);
    await userEvent.click(screen.getByRole("button", { name: /like post/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onLike).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("button", { name: /like post/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /like post/i })).toHaveTextContent("0");
  });

  it("asks anonymous users to log in instead of liking", async () => {
    const onLike = vi.fn();
    withAuth(<PostCard post={post()} onLike={onLike} />, { user: null, isAuthenticated: false });
    await userEvent.click(screen.getByRole("button", { name: /like post/i }));
    expect(onLike).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("shows edit/delete only for the author", () => {
    const { unmount } = withAuth(<PostCard post={post()} />);
    expect(screen.queryByLabelText("Edit post")).not.toBeInTheDocument();
    unmount();
    withAuth(<PostCard post={post({ author: { _id: "u1", name: "Me" } })} />);
    expect(screen.getByLabelText("Edit post")).toBeInTheDocument();
  });
});

describe("CommentSection", () => {
  it("adds a comment using the server's response", async () => {
    const serverList = [
      { _id: "c1", content: "Hello!", author: { _id: "u1", name: "Me" }, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const onAdd = vi.fn().mockResolvedValue(serverList);
    withAuth(<CommentSection postId="p1" comments={[]} onAddComment={onAdd} onDeleteComment={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /write a comment/i }));
    await userEvent.type(screen.getByPlaceholderText(/share your thoughts/i), "Hello!");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAdd).toHaveBeenCalledWith("p1", "Hello!");
    expect(await screen.findByText("Hello!")).toBeInTheDocument();
    expect(screen.getByText("Comments (1)")).toBeInTheDocument();
  });

  it("does not add a fake comment when the request fails and keeps the text", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("fail"));
    withAuth(<CommentSection postId="p1" comments={[]} onAddComment={onAdd} onDeleteComment={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /write a comment/i }));
    const box = screen.getByPlaceholderText(/share your thoughts/i);
    await userEvent.type(box, "Will fail");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(screen.getByText("Comments (0)")).toBeInTheDocument();
    expect(box).toHaveValue("Will fail");
  });

  it("lets only the author delete and updates from the server list", async () => {
    const comments = [
      { _id: "c1", content: "mine", author: { _id: "u1", name: "Me" }, createdAt: "2026-01-01T00:00:00Z" },
      { _id: "c2", content: "theirs", author: { _id: "u2", name: "Other" }, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const onDelete = vi.fn().mockResolvedValue([comments[1]]);
    withAuth(<CommentSection postId="p1" comments={comments} onAddComment={vi.fn()} onDeleteComment={onDelete} />);
    expect(screen.getAllByTitle("Delete comment")).toHaveLength(1);
    await userEvent.click(screen.getByTitle("Delete comment"));
    expect(onDelete).toHaveBeenCalledWith("p1", "c1");
    await waitFor(() => expect(screen.queryByText("mine")).not.toBeInTheDocument());
  });

  it("prompts anonymous users to log in", () => {
    withAuth(<CommentSection postId="p1" comments={[]} />, { user: null, isAuthenticated: false });
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });
});

describe("Login page", () => {
  it("shows the server's error message on failure", async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { message: "Invalid credentials" } } });
    withAuth(<Login />, { user: null, isAuthenticated: false, login });
    await userEvent.type(screen.getByLabelText("Email"), "a@b.io");
    await userEvent.type(screen.getByLabelText("Password"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid credentials"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("validates the email before calling login", async () => {
    const login = vi.fn();
    withAuth(<Login />, { user: null, isAuthenticated: false, login });
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(login).not.toHaveBeenCalled();
  });
});

describe("AuthProvider", () => {
  const Probe = () => (
    <AuthContext.Consumer>
      {(v) => (
        <div>
          <span data-testid="state">{v.isLoading ? "loading" : v.isAuthenticated ? "in" : "out"}</span>
          <button onClick={() => v.login("a@b.io", "pw").catch(() => {})}>login</button>
          <button onClick={v.logout}>logout</button>
        </div>
      )}
    </AuthContext.Consumer>
  );

  it("keeps the session on network errors but drops it on 401", async () => {
    localStorage.setItem("token", "t");
    axios.get.mockRejectedValueOnce({ message: "Network Error" });
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(localStorage.getItem("token")).toBe("t");
    unmount();

    axios.get.mockRejectedValueOnce({ response: { status: 401 } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
  });

  it("login stores the token; logout clears it", async () => {
    axios.post.mockResolvedValue({ data: { token: "tok", user: me } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in"));
    expect(localStorage.getItem("token")).toBe("tok");
    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("ProtectedRoute", () => {
  it("redirects anonymous users to /login", () => {
    render(
      <MemoryRouter initialEntries={["/create"]}>
        <AuthContext.Provider value={{ isAuthenticated: false, isLoading: false }}>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route path="/create" element={<ProtectedRoute><div>secret</div></ProtectedRoute>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});

describe("ChatBot", () => {
  it("sends the conversation to the backend proxy and shows the reply", async () => {
    window.HTMLElement.prototype.scrollTo = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "Sure, happy to help" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatBot isOpen onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/type your message/i), "Hi bot");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText("Sure, happy to help")).toBeInTheDocument();
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/chat$/);
    expect(JSON.parse(opts.body)).toEqual({ messages: [{ role: "user", content: "Hi bot" }] });
  });

  it("shows a friendly error when the backend fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "x" }) }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ChatBot isOpen onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/type your message/i), "Hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/there was an error/i)).toBeInTheDocument();
  });
});
