// These tests use the REAL axios (no vi.mock) to verify the shared API layer.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import "../utils/api";
import { attachAuth } from "../utils/api";
import { API_URL } from "../utils/constants";
import { AuthProvider, AuthContext } from "../context/AuthContext";

vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));
import { toast } from "react-hot-toast";

const originalAdapter = axios.defaults.adapter;
const ok = (config, data) => ({ data, status: 200, statusText: "OK", headers: {}, config });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  axios.defaults.adapter = originalAdapter;
});

describe("shared axios layer", () => {
  it("sets the base URL once for every request", () => {
    expect(axios.defaults.baseURL).toBe(API_URL);
  });

  it("adds the stored token as a Bearer header", async () => {
    localStorage.setItem("token", "abc");
    let seen;
    axios.defaults.adapter = async (config) => {
      seen = config.headers.Authorization;
      return ok(config, {});
    };
    await axios.get("/api/anything");
    expect(seen).toBe("Bearer abc");
  });

  it("sends no Authorization header for anonymous visitors", async () => {
    let seen = "unset";
    axios.defaults.adapter = async (config) => {
      seen = config.headers.Authorization;
      return ok(config, {});
    };
    await axios.get("/api/anything");
    expect(seen).toBeUndefined();
  });

  it("never overrides an explicit Authorization header", () => {
    localStorage.setItem("token", "stored");
    const cfg = attachAuth({ headers: { Authorization: "Bearer explicit" } });
    expect(cfg.headers.Authorization).toBe("Bearer explicit");
    expect(attachAuth({}).headers.Authorization).toBe("Bearer stored");
  });
});

describe("401 auto-logout with the shared layer", () => {
  const Probe = () => (
    <AuthContext.Consumer>
      {(v) => (
        <div>
          <span data-testid="state">{v.isLoading ? "loading" : v.isAuthenticated ? "in" : "out"}</span>
          <button onClick={() => axios.get("/api/protected").catch(() => {})}>call</button>
          <button onClick={() => axios.get("/api/public-401").catch(() => {})}>anon</button>
        </div>
      )}
    </AuthContext.Consumer>
  );

  const reject401 = (config) =>
    Promise.reject(
      new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
        status: 401,
        data: {},
        headers: {},
        config,
      })
    );

  it("logs the user out when an authenticated request returns 401", async () => {
    localStorage.setItem("token", "tok");
    axios.defaults.adapter = async (config) =>
      config.url === "/api/auth/user"
        ? ok(config, { _id: "u1", name: "Me" })
        : reject401(config);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in"));
    screen.getByText("call").click();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Session expired. Please log in again.");
  });

  it("does not show 'session expired' for anonymous 401s", async () => {
    axios.defaults.adapter = async (config) => reject401(config);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    screen.getByText("anon").click();
    await new Promise((r) => setTimeout(r, 50));
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("bundle size budget script", () => {
  const script = join(__dirname, "..", "..", "scripts", "check-bundle-size.mjs");
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bundle-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("passes for small bundles", () => {
    writeFileSync(join(dir, "a.js"), "console.log('hi');");
    const out = execFileSync(process.execPath, [script, dir]).toString();
    expect(out).toMatch(/budget OK/);
  });

  it("fails when a single file exceeds the limit", () => {
    // incompressible random data => gzip size ~ raw size
    writeFileSync(join(dir, "big.js"), randomBytes(130 * 1024));
    const res = spawnSync(process.execPath, [script, dir]);
    expect(res.status).toBe(1);
    expect(res.stderr.toString()).toMatch(/big\.js/);
  });

  it("fails when the total exceeds the limit", () => {
    for (let i = 0; i < 5; i++) {
      writeFileSync(join(dir, `c${i}.js`), randomBytes(90 * 1024));
    }
    const res = spawnSync(process.execPath, [script, dir]);
    expect(res.status).toBe(1);
    expect(res.stderr.toString()).toMatch(/total JS/);
  });

  it("exits 2 when there is no build output", () => {
    const res = spawnSync(process.execPath, [script, join(dir, "missing")]);
    expect(res.status).toBe(2);
  });
});
