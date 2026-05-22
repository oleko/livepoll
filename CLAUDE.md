@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server (Next.js on port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

No test runner is configured.

## Environment

`.env.local` (never commit):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — admin operations (server-only, never expose to client)
- `YANDEX_API_KEY` / `YANDEX_FOLDER_ID` — AI Q&A summarization (Yandex GPT Lite)

## Architecture

**LivePoll** is a Next.js 15 App Router + Supabase SaaS polling platform for live events.

### Routing structure

```
/                          — Landing page
/auth/login|register       — Auth pages
/onboarding                — Obsolete (auto-org now created on signup)
/org/[slug]                — Org dashboard (sessions list)
/org/[slug]/sessions/new   — Create session
/org/[slug]/sessions/[id]  — Session admin (polls, Q&A, share)
/org/[slug]/members        — Org members
/org/[slug]/settings       — Plan & org settings
/join/[code]               — Participant voting screen
/display/[code]            — Presenter/display screen (full-screen, no scroll)
/admin                     — Platform admin (orgs + subscriptions)
/admin/users               — Platform admin (users management)
/docs/privacy              — Legal documents
```

### Supabase clients

- `src/lib/supabase/server.ts` — cookie-based client; respects RLS; use for auth reads
- `src/lib/supabase/admin.ts` → `createAdminClient()` — SERVICE ROLE; bypasses RLS; required for all server actions that write data or cross-user reads

**Rule**: Server Actions always use `createAdminClient()` for DB operations. The cookie client is only used to verify the authenticated user (`supabase.auth.getUser()`).

### Authorization (guards)

`src/lib/actions/guards.ts` — three guard functions used at the start of every mutating Server Action:

```typescript
getAuthUser()                              // throws if not logged in; returns { user, admin }
assertSessionMember(userId, sessionId, admin)  // throws if user's org doesn't own the session
assertOrgOwner(userId, orgId, admin)           // throws if user is not org owner
assertOwnerOfMemberOrg(callerId, memberId, admin) // asserts caller owns the org of memberId
```

Never skip these guards when writing new server actions that mutate data.

### Plan limits

`src/lib/limits.ts` — single source of truth:

| Plan key | Display name  | Sessions/month | Polls/session | Members |
|----------|---------------|----------------|---------------|---------|
| `free`   | Бесплатный    | 3              | 5             | 1       |
| `pro`    | Стандарт      | 5              | 15            | 5       |
| `team`   | Про           | 20             | 30            | 10      |

Plan stored in `organizations.plan` as `free | pro | team`. `plan_expires_at` controls subscription expiry (checked in settings page, shown red when expired in admin).

### Real-time

Supabase Realtime Broadcast (not Postgres changes) via `realtimeBroadcast()` in `polls.ts`:
- Topic `session-polls:{sessionId}` — event `poll_change` (activated/closed)
- Topic `poll-votes:{pollId}` — event `vote` (new vote)
- Topic `session-questions:{sessionId}` — event `question_change` (new/updated/pinned)

Display screen and join screen subscribe to these channels client-side.

### Poll types

Seven types in `types/database.ts`: `multiple_choice`, `temperature`, `word_cloud`, `emoji_cloud`, `qa`, `like_dislike`, `planning_poker`.

Rendering: `VoteInterface.tsx` (participant) and `PollList.tsx` → `PollResults` (inline results for ended/closed polls).

### Platform admin

`/admin` and `/admin/users` are guarded by `platform_role = 'platform_admin'` on the `profiles` table. The guard is in `src/app/admin/layout.tsx` (server-side redirect). Platform admins are created by other platform admins via the Create User form in `/admin/users`.

### Security

- All server actions validate ownership with guards before any DB write
- `voter_token` (UUID) validated with regex before insert: `UUID_RE = /^[0-9a-f]{8}-...-4.../i`
- Error messages shown to users never leak internal details (server logs the real error)
- Security headers set in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- RLS policies on `votes` and `questions` restrict anon reads to active sessions only

### Display screen

`src/app/display/[code]/DisplayScreen.tsx` — must remain `h-screen overflow-hidden` (no scroll at any resolution). QR code and text sized with `clamp()` in `vh` units to adapt from laptops to projectors without media queries.

### Sharing

`src/app/org/[slug]/sessions/[id]/SharePanel.tsx` — share buttons for Telegram, VK, Max (`https://max.ru/:share?text=...`), Email, and clipboard copy. Hidden when session is ended.

### Organization auto-creation

On signup/login/OAuth callback, `ensureUserOrg(userId, displayName)` in `organizations.ts` is called. It creates "Мои мероприятия" org if the user has none. There is no manual org creation step in the flow.
