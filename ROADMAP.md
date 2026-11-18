# Improvement Roadmap

Each phase is independently shippable. Every change must keep CI green
(`.github/workflows/ci.yml`: server tests, client lint + tests + build, `npm audit`).

**Definition of done for any task:** code + tests (server: `server/tests`, client: `project/src/test`) + README/env docs updated + CI passes.

## Phase 0 - Finish the baseline (do first, ~1 day)
- [ ] Revoke the old leaked Gemini key; set `GROQ_API_KEY`, `JWT_SECRET`, `MONGODB_URI`, `CLIENT_ORIGIN` on Render.
- [ ] Rotate `JWT_SECRET` and confirm login/register/chat on the deployed site.
- [ ] Squash secrets from git history (`git filter-repo` / BFG) if the repo is public.
- [x] Fix the 3 remaining `react-hooks/exhaustive-deps` warnings (`EditPost`, `BlogPost`).
- [ ] Turn on branch protection: require the CI jobs to pass before merging.

## Phase 1 - Security hardening (~2-3 days)
- [ ] Move the JWT from `localStorage` to an httpOnly, SameSite cookie + CSRF protection (or short-lived access + refresh token).
- [~] Password rules: 8+ chars and login/register rate limits done; breached-password check and per-account lockout not done.
- [ ] Email verification and password reset flow.
- [ ] Sanitise/limit post content server-side if rich text or Markdown is added (use `sanitize-html` / DOMPurify).
- [x] NoSQL-injection sanitiser (own middleware), request-ID logging, structured logs (`pino`).
- [x] Dependabot (npm, weekly) + `npm audit` gate (already in CI).

## Phase 2 - Reliability & quality (~3 days)
- [x] End-to-end tests with Playwright against a real server + in-memory Mongo (register -> post -> like -> comment -> logout).
- [x] Coverage reporting (`vitest --coverage`), target 80% server / 70% client; fail CI below target.
- [~] 401 -> auto-logout interceptor done; per-page header code not yet replaced by a shared axios instance.
- [x] Error boundary + friendly offline / Render cold-start message ("server is waking up").
- [~] `/healthz` with DB status done (used by render.yaml); uptime monitor (UptimeRobot) still to be set up by you.
- [~] Indexes on `Post.createdAt/tags/author` added; confirm the unique `User.email` index exists in production.

## Phase 3 - Product features (~1-2 weeks)
- [~] Markdown with preview done (raw HTML never rendered); cover images (Cloudinary) not done.
- [x] Search (title/content/tags, regex-based, not a text index) and sort by newest/oldest/popular.
- [~] Edit/delete own comments done; reply threads and comment pagination not done.
- [~] Public author pages (`/u/:id`) done; follow system not done.
- [ ] Drafts and scheduled publishing; post slugs for SEO-friendly URLs.
- [ ] Bookmarks / "posts I liked" page.
- [ ] Chatbot upgrades: streaming replies, conversation persistence, "help me write this post" context from the current draft, per-user daily quota.

## Phase 4 - UX, accessibility, performance (~1 week)
- [~] Skip link, labels, page titles done; formal audit (contrast, axe in Playwright) not done.
- [~] Likes are optimistic with revert and errors toast; skeleton loaders not done.
- [ ] Image lazy-loading, route-level code splitting (already lazy), bundle-size budget in CI.
- [~] Per-route page titles done; OpenGraph tags and sitemap not done.
- [ ] Dark mode; mobile polish of the chat widget.

## Phase 5 - Delivery & operations (~2 days)
- [~] `render.yaml` and `netlify.toml` ready; you must connect the repos in Render/Netlify to enable auto-deploy and PR previews.
- [ ] Separate staging environment/database.
- [ ] Error tracking (Sentry) on client and server.
- [~] Backup workflow + restore command written; add the `MONGODB_URI` repo secret to activate it (untested).
- [~] CHANGELOG added; automated release notes not set up.

## Suggested order
Phase 0 -> Phase 1 (cookies + reset flow) -> Phase 2 (E2E + coverage) -> Phase 3 features by value
(search, Markdown, comments) -> Phase 4 -> Phase 5.

## Working loop for each task
1. Open an issue with acceptance criteria.
2. Branch `feat/<name>`; write the failing test first.
3. Implement; run `npm test` (server and project), `npm run lint`, `npm run build`.
4. Open a PR; CI must pass; squash-merge to `main`.
5. Verify on the deployed site; tick the box here.


## Status (latest)
Legend: [x] done and tested, [~] partly done (see note), [ ] not started.
Verified: server 25 tests (~90% line coverage), client 72 tests (~95%), 13 Playwright browser tests, lint and build clean.
Needs your accounts/decisions (not doable from code): revoke the leaked key and set Render env vars, scrub git history, branch protection,
Sentry, Cloudinary, email verification/password reset (needs an email provider), staging environment.
Cookie auth is deliberately deferred: browsers block cross-site cookies between Netlify and Render; revisit with a shared parent domain.
Not started: drafts/scheduling, slugs, bookmarks, chatbot streaming/persistence, dark mode, image lazy-loading, bundle-size budget.
