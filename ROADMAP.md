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
- [x] Password rules: 8+ chars, breached-password check (HaveIBeenPwned k-anonymity, fails open), per-account lockout (5 failures -> 15 min), and rate limits.
- [ ] Email verification and password reset flow.
- [ ] Sanitise/limit post content server-side if rich text or Markdown is added (use `sanitize-html` / DOMPurify).
- [x] NoSQL-injection sanitiser (own middleware), request-ID logging, structured logs (`pino`).
- [x] Dependabot (npm, weekly) + `npm audit` gate (already in CI).

## Phase 2 - Reliability & quality (~3 days)
- [x] End-to-end tests with Playwright against a real server + in-memory Mongo (register -> post -> like -> comment -> logout).
- [x] Coverage reporting (`vitest --coverage`), target 80% server / 70% client; fail CI below target.
- [x] Shared API layer (`src/utils/api.js`: base URL + auth header) and 401 -> auto-logout.
- [x] Error boundary + friendly offline / Render cold-start message ("server is waking up").
- [~] `/healthz` with DB status done (used by render.yaml); uptime monitor (UptimeRobot) still to be set up by you.
- [~] Indexes on `Post.createdAt/tags/author` added; confirm the unique `User.email` index exists in production.

## Phase 3 - Product features (~1-2 weeks)
- [~] Markdown with preview done (raw HTML never rendered); cover images (Cloudinary) not done.
- [x] Search (title/content/tags, regex-based, not a text index) and sort by newest/oldest/popular.
- [~] Edit/delete own comments done; reply threads and comment pagination not done.
- [~] Public author pages (`/u/:id`) done; follow system not done.
- [~] Drafts done (private to author, publish via edit); scheduled publishing and slugs not done.
- [x] Bookmarks (toggle, `/bookmarks` page). A "posts I liked" page is not done.
- [ ] Chatbot upgrades: streaming replies, conversation persistence, "help me write this post" context from the current draft, per-user daily quota.

## Phase 4 - UX, accessibility, performance (~1 week)
- [~] Skip link, labels, page titles done; formal audit (contrast, axe in Playwright) not done.
- [x] Skeleton loaders, optimistic likes/bookmarks with revert, error toasts.
- [x] Route-level code splitting and bundle-size budget in CI (no images yet, so no lazy-loading needed).
- [x] Per-route titles/meta, OpenGraph/Twitter tags, `robots.txt`, server-generated `/sitemap.xml` (proxied by Netlify).
- [~] Chat widget mobile polish done; dark mode not done.

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
Verified: server 46 tests (~92% line coverage), client 105 tests (~97%), 18 Playwright browser tests, lint, build and bundle budget clean.
Needs your accounts/decisions (not doable from code): revoke the leaked key (if not yet), scrub git history, branch protection,
uptime monitor, Sentry, Cloudinary, email verification/password reset (needs an email provider), staging environment, connect Render/Netlify auto-deploy.
Cookie auth is deliberately deferred: browsers block cross-site cookies between Netlify and Render; revisit with a shared parent domain.
Not started: reply threads, comment pagination, follow system, slugs/scheduling, chatbot streaming/persistence, dark mode, "posts I liked" page, axe accessibility audit.
