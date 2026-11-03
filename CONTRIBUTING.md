# Contributing

Pa-Varaq is built for friends and small communities, so prefer **simple, low-friction** features over enterprise machinery. Read the [README](README.md) first: it explains the layout, the architecture rules and where each kind of change belongs.

## Ground rules

| Area                                                                                | Rule                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Code, comments, docs, commit messages, API routes, OpenAPI                          | **English**                                                                                                               |
| Everything users see in the web app (labels, buttons, toasts, errors, empty states) | **Natural, modern Persian**, RTL                                                                                          |
| Privacy                                                                             | No photo uploads, no exact locations, never store a raw phone number, never expose private identity fields to other users |

New API error codes need a Persian message in `apps/web/lib/labels.ts`.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm infra && pnpm db:deploy && pnpm db:seed
pnpm dev
```

## Before opening a PR

```bash
pnpm format
pnpm typecheck
pnpm test
```

CI runs the same checks plus a web build and a migrations/seed run against Postgres.

## Backend conventions

- Keep the module structure (`repository` → `service` → `routes`). Don't import another module's repository; depend on its service and wire it in `src/app.ts`.
- Atomic cross-module writes take an optional `tx`.
- Put request/response schemas the web app also needs in `packages/shared`.
- Keep rules that can be pure free of I/O and unit-test them (see `loan-state-machine.ts`).
- Schema change: edit `schema.prisma`, run `pnpm db:migrate`, and keep the hand-written SQL (extensions, indexes, constraints) in the migrations.
- Never build public user data from a whole database row; add fields explicitly to `toPublicUser`.

## Frontend conventions

- Mobile first. Use logical Tailwind utilities (`ms-*`, `ps-*`, `start-*`, `text-start`) instead of left/right so RTL works.
- Colours come from the CSS variables in `app/globals.css`; check light and dark themes.
- Wrap mutations in `mutate()` from `lib/use-api.ts` and import `toast` from `@/lib/notify`.
- Show other people by first name (`displayName`), not by username.
- Digits shown to users go through `toFaDigits`; dates through `formatDate` (Jalali).

## Commits and PRs

Use [Conventional Commits](https://www.conventionalcommits.org) in English, for example `feat(circulation): lock PIN after 5 attempts`. Explain what changed and why. For UI changes include a screenshot at mobile width.

## How work is assigned

- Only issues labelled `status:ready` can be taken. Look for `good first issue` if you are new.
- Comment "I'll take this" on the issue and **wait until the maintainer assigns it to you** before starting.
- One assignee per issue. If you stop working on it, unassign yourself (or say so in a comment) so someone else can pick it up.
- Have an idea that is not on the board? Open a feature request first and discuss it before writing code.

## Workflow

1. Fork the repository and clone your fork.
2. Create a branch from `main`: `feat/…`, `fix/…` or `docs/…` (for example `fix/otp-expiry-message`).
3. Make your change and run the checks in "Before opening a PR".
4. Open a pull request against `main` and fill in the template (link the issue with `Closes #123`).
5. CI must pass. The maintainer reviews, you address feedback, and the PR is squash-merged.

Nothing reaches `main` without the maintainer's approval.

## PR size and review

- Keep PRs small, with one concern each. Unrelated changes (formatting sweeps, renames) belong in separate PRs.
- The maintainer checks: privacy rules (no private identity fields exposed), RTL and mobile layout, new error codes having a Persian message, tests for new logic, and that the change follows the module structure.
- Reviews are best effort, usually within a week. If a PR has had no response after that, a polite ping is welcome.

## Community and security

Be kind: this project follows the [Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, follow [SECURITY.md](SECURITY.md); do not open a public issue.
