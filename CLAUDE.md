@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server (Next.js on port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:types     # Regenerate src/types/database.ts from Supabase schema
```

No test runner is configured.

## Environment

`.env.local` (never commit):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — admin operations (server-only, never expose to client)
- `YANDEX_API_KEY` / `YANDEX_FOLDER_ID` — AI features (YandexGPT Lite)
- `RESEND_API_KEY` — transactional email (feedback notifications)

## Architecture

**LivePoll** is a Next.js 16 / React 19 App Router + Supabase SaaS polling platform for live events. Current version: **1.0**.

### Routing structure

```
/                              — Landing page
/auth/login|register           — Auth pages (email + Yandex OAuth)
/onboarding                    — Obsolete (org auto-created on signup)
/org/[slug]                    — Org dashboard (sessions
 list with poll/participant counts)
/org/[slug]/sessions/new       — Create session (with templates)
/org/[slug]/sessions/[id]      — Session admin (polls + slides lineup, Q&A, share, AI summary)
/org/[slug]/members            — Team management (invite/remove hosts)
/org/[slug]/settings           — Plan, branding (logo, accent color, display bg/header)
/join/[code]                   — Participant voting screen (no auth required)
/display/[code]                — Presenter/projector screen (fullscreen, no scroll)
/admin                         — Platform admin: orgs list, plan changes
/admin/users                   — Platform admin: users list, roles, create user
/admin/feedback                — Platform admin: feedback inbox
/help                          — Help center (8 articles)
/help/changelog                — Version history (v0.1–v1.0)
/docs/privacy                  — Privacy policy
```

### Supabase clients

- `src/lib/supabase/server.ts` — cookie-based client; respects RLS; use **only** to verify authenticated user
- `src/lib/supabase/admin.ts` → `createAdminClient()` — SERVICE ROLE; bypasses RLS; required for **all** server actions that read or write data

**Rule**: Server Actions always use `createAdminClient()` for DB operations. Cookie client is only for `supabase.auth.getUser()`.

### Authorization (guards)

`src/lib/actions/guards.ts` — used at the top of every mutating Server Action:

```typescript
getAuthUser()                                          // throws if not logged in; returns { user, admin }
assertSessionMember(userId, sessionId, admin)          // throws if user's org doesn't own the session
assertOrgOwner(userId, orgId, admin)                   // throws if user is not org owner
assertOwnerOfMemberOrg(callerId, memberId, admin)      // caller owns the org of memberId
```

Never skip guards in server actions that mutate data.

### Plan limits

`src/lib/limits.ts` — single source of truth. Plans in `organizations.plan`:

| Plan key    | Display name | Sessions/mo | Polls/session | Members | Max participants |
|-------------|--------------|-------------|---------------|---------|-----------------|
| `free`      | Бесплатный   | 3           | 5             | 1       | 30              |
| `starter`   | Старт        | ∞           | 10            | 1       | 100             |
| `pro`       | Про          | ∞           | ∞             | 1       | 500             |
| `team`      | Команда      | ∞           | ∞             | 5       | ∞               |
| `unlimited` | Безлимитный  | ∞           | ∞             | ∞       | ∞               |

Participant limit is enforced at vote time in `submitVote()` — checks unique voter tokens across all session polls.

### Poll types (8)

`multiple_choice`, `temperature`, `word_cloud`, `emoji_cloud`, `qa`, `like_dislike`, `planning_poker`, `idea_wall`

- **idea_wall**: participants submit text ideas (stored as questions); displayed as colored cards on the display screen. Moderated via the Q&A panel (host can hide entries).
- **qa**: question submission with upvoting; pinnable to display screen.
- **multiple_choice**: supports quiz mode (correct answer + explanation), multiple answers (`max_answers`), vote limit auto-close.
- **planning_poker**: Fibonacci sequence voting, hidden until host reveals.

Rendering:
- Participant: `src/app/join/[code]/VoteInterface.tsx`
- Host (inline results): `PollList.tsx` → `PollResults` component
- Display screen: `DisplayScreen.tsx` via Recharts charts

### Slide types (7)

`splash`, `speaker`, `schedule`, `quote`, `final`, `spin_wheel`, `announcement`

- **spin_wheel**: animated slot-machine picker; options list set in `AddSlidePanel`; winner chosen randomly with deceleration animation.
- **announcement**: full-screen text + optional countdown timer (seconds); timer shown in red when ≤ 5 s.

Defined in `src/app/display/[code]/SlideView.tsx`.
Created/managed via `src/app/org/[slug]/sessions/[id]/AddSlidePanel.tsx`.

### Session page structure

`src/app/org/[slug]/sessions/[id]/page.tsx` — layout:
- **Left column**: unified lineup (polls + slides intermixed, `PollList.tsx` + `SlidesPanel.tsx`), drag-and-drop reorder
- **Right column top**: `CreationTabs.tsx` (tab switcher: 📊 Опрос / 📽 Экран), `AnnouncementForm.tsx`
- **Right column bottom**: `QAPanel.tsx` (Q&A moderation, idea_wall entries, fullscreen modal with filters)
- **Header**: session controls, share panel, `SessionSummaryButton.tsx` (AI summary for ended sessions)

### Sections

Sessions can have named sections (e.g., «День 1», «Утренний блок»). Polls are assigned to sections. Managed via `SectionManager.tsx` / `sections.ts`. Sections affect export grouping.

### Real-time

Supabase Realtime Broadcast (not Postgres changes):
- `session-polls:{sessionId}` → `poll_change` — poll activated/closed, slide activated
- `poll-votes:{pollId}` → `vote` — new vote (payload: `{ value, ts }`)
- `session-questions:{sessionId}` → `question_change` — new question, pin/unpin, status change
- `session-announce:{sessionId}` → `announcement` — timer announcements from host
- `session-pulse:{sessionId}` → `pulse` — 🔥 reactions from participants

Display screen and join screen subscribe client-side in `DisplayScreen.tsx` and `VoteInterface.tsx`.

### AI features

All in `src/lib/actions/ai.ts` via `callYandex()` helper (YandexGPT Lite):
- `generatePollOptions(sessionId, pollTitle, pollType)` — AI-generated answer options for a poll
- `summarizeQuestions(sessionId)` — Q&A summary: key themes, top questions
- `generateSessionSummary(sessionId)` — end-of-session AI digest: all poll results + Q&A → 3–5 sentence summary

### White label / Branding

`/org/[slug]/settings` → `BrandingForm.tsx`. Settings stored in `organizations.settings` jsonb:
```json
{ "logo_url": "...", "accent_color": "#6366f1", "display_bg": "dark", "display_header": "..." }
```
Applied on display screen and join screen when white label is enabled.

### Export

`ExportButton.tsx` — PDF (via browser print) and CSV. Exports all closed polls with results, grouped by section. Available only on starter+ plans.

### Platform admin

`/admin` and `/admin/users` guarded by `platform_role = 'platform_admin'` in `profiles`. Guard in `admin/layout.tsx` (server redirect). Platform admins created via `/admin/users` → CreateUserForm.

### Security

- All server actions validate ownership with guards before any DB write
- `voter_token` (UUID) validated with regex before insert
- Error messages to users never leak internal details
- Security headers in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- RLS on `votes` and `questions` restricts anon reads to active sessions

### Display screen

`src/app/display/[code]/DisplayScreen.tsx` — must remain `h-screen overflow-hidden` (no scroll). Content sized with `clamp()` in `vh` units to adapt from laptops to projectors.

### Sharing

`SharePanel.tsx` — Telegram, VK, Max (`https://max.ru/:share?text=...`), Email, clipboard. Hidden when session is `ended`.

### Organization auto-creation

On signup/login/OAuth, `ensureUserOrg(userId, displayName)` in `organizations.ts` creates «Мои мероприятия» org if none exists. No manual org creation step.

### Landing page design system

`src/components/LandingPage.tsx` — marketing landing page. Key components:

- `InViewAnimate` (`src/components/InViewAnimate.tsx`) — scroll-triggered animation wrapper. SSR-safe: `opacity-0` applied only after client hydration via `mounted` state. Accepts `enterClass` (e.g. `animate-from-left`) and optional `delay` ms.
- `InViewSection` (`src/components/InViewSection.tsx`) — wraps `<section>`; adds `stagger-active` or `animate-section-rise` on intersection.
- `src/app/globals.css` — animation keyframes: `fade-in`, `section-rise`, `item-rise`, `from-left`, `from-right`, `scale-in`. Custom easing vars: `--ease-out`, `--ease-in-out`, `--ease-spring`. All animations respect `prefers-reduced-motion`.
- `src/app/icon.tsx` — favicon via Next.js `ImageResponse`: indigo rounded square + 3 bar-chart bars.

Landing page layout (top to bottom): Nav → Hero (dark, split) → Three Pillars (asymmetric 2-col) → AI block → Slides → Quiz → Poll types → How it works → Pricing → CTA → Footer.

### Database migrations

```
001_initial_schema.sql   — all core tables + RLS
002_realtime.sql         — realtime broadcast config
003_realtime_rls_fix.sql — RLS fix for anon vote/question reads
004_sections.sql         — session_sections table
005_slides.sql           — session_slides table
006_spin_wheel.sql       — spin_wheel + announcement slide types
007_idea_wall.sql        — idea_wall poll type
```
