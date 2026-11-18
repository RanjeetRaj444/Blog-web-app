# Changelog

Format: [Keep a Changelog](https://keepachangelog.com), versioning: [SemVer](https://semver.org).

## [Unreleased]

## [0.2.0]
### Added
- Server: `/healthz`, request-id structured logging (pino), NoSQL-injection sanitising, DB indexes.
- Server: search (`q`), sorting (`newest|oldest|popular`), pagination and tag filter on posts.
- Server: comment editing, public author endpoint (`/api/users/:id/public`).
- Chatbot proxy (`/api/chat`, Groq) so the API key stays server-side.
- Test suites (server API, client components, Playwright e2e) and CI.
- Render/Netlify config, Dependabot, nightly backup workflow.

### Changed
- Passwords now require 8+ characters.
- Auth errors return real messages; 403 for forbidden actions; atomic likes.
- JWT secret is mandatory (no insecure fallback); CORS restricted via `CLIENT_ORIGIN`.

### Fixed
- "Liked by me" state, fake comments on failed requests, duplicate-tag input bug,
  edit page open to non-authors, broken "Create your first post" button, forced reload on logout.

### Security
- Removed committed `.env`; rotate the previously leaked key.
