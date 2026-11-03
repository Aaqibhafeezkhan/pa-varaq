# Pa-Varaq (پاورق)

Peer-to-peer lending of physical books for friends, campuses and local communities, plus a personal bookshelf tracker. Free and open source.

The product UI is entirely in **Persian (RTL, Vazirmatn)**. Code, comments, docs, commits and API text are in **English**.

## What it does

- **Global discovery** – every available book is visible and borrowable. Circles (campus, café, friend group) are only an optional filter.
- **Personal library** – add books by scanning the ISBN barcode, typing the ISBN, or entering details by hand.
- **External loans** – log a book lent to someone who is not on Pa-Varaq (name + due date) and get a WhatsApp reminder link.
- **Loan flow with a 4-digit PIN handshake** – request → approve → hand over → return, with the physical condition logged at both ends.
- **Karma tokens** – lending earns a token, borrowing locks one until the book is back.
- **Book Passport** – every physical copy has a timeline; each borrower can leave a one-sentence memory after returning it.
- **Wishlist** – heart a book to save its edition.
- **Identity verification** – national code + birth date are required before adding books or borrowing. Browsing is open.

## Quick start

Requirements: Node 20+, pnpm, Docker.

```bash
cp .env.example .env
pnpm install
pnpm infra          # Postgres + Redis in Docker
pnpm db:deploy      # apply migrations
pnpm db:seed        # demo data (idempotent)
pnpm dev            # API :4000 + web :3000, both with hot reload
```

| What    | URL                        |
| ------- | -------------------------- |
| Web app | http://localhost:3000      |
| API     | http://localhost:4000      |
| Swagger | http://localhost:4000/docs |

**Demo login:** phone `09121110001` … `09121110005`, code `123456` (fixed OTP in development, see `DEV_FIXED_OTP`).
Those users are already identity-verified. Any other phone number starts the sign-up flow.
Demo circle invite codes: `UTEHRAN1`, `METROCAFE`, `FRIENDS24`.

### Everything in Docker

```bash
docker compose up --build   # web, api, postgres, redis; migrates and seeds automatically
```

Use this to test the full stack, not for day-to-day work (it rebuilds images). If a host port is taken, set `POSTGRES_PORT`, `REDIS_PORT`, `API_HOST_PORT` or `WEB_HOST_PORT` in `.env`. If Docker Hub is unreachable, set `NODE_IMAGE` to a mirror of `node:22-slim`.

## Commands

| Command                             | What it does                                                       |
| ----------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                          | Starts Postgres/Redis, then API (`tsx watch`) and web (`next dev`) |
| `pnpm infra`                        | Starts only Postgres and Redis                                     |
| `pnpm db:deploy`                    | Applies existing migrations                                        |
| `pnpm db:migrate`                   | Creates a new migration from `schema.prisma` (dev)                 |
| `pnpm db:seed`                      | Loads demo data                                                    |
| `pnpm db:generate`                  | Regenerates the Prisma client                                      |
| `pnpm test` / `pnpm typecheck`      | Unit tests / TypeScript checks for every package                   |
| `pnpm format` / `pnpm format:check` | Prettier write / check                                             |

## Repository layout

```
apps/
  api/                       Fastify + Prisma + PostgreSQL + Redis
    prisma/
      schema.prisma          Data model
      migrations/            SQL migrations (some are hand-edited, see below)
      seed.ts                Demo data
    src/
      app.ts                 Composition root: wires modules together
      discover.routes.ts     Read-only "platform pulse" for the home page
      config.ts              Env parsing (zod)
      lib/                   db, redis, errors, hashing helpers
      plugins/auth.ts        JWT + `authenticate` hook
      modules/
        auth/                Phone OTP login and registration
        users/               Profile, avatar, karma, trust, identity
        catalog/             Editions, copies, search, feed, wishlist
        circulation/         Loans, state machine, PIN handshake, external loans
        passport/            Book Passport timeline
        circles/             Circles and optional filtering
  web/                       Next.js (App Router), Tailwind, Radix, framer-motion
    app/
      login/                 Phone → OTP → sign-up
      (app)/                 Authenticated area (shell + pages)
        page.tsx             Discover (home)
        library/ loans/ circles/ profile/ wishlist/ verify/ books/[id]/
      manifest.ts, pwa-icon/ PWA manifest and generated icons
    components/              UI building blocks (see below)
    lib/                     api client, auth, wishlist, labels (Persian copy), format
packages/
  shared/                    Zod schemas, constants, validators (national code, phone, ISBN, Jalali date)
```

## Where do I change…?

| I want to change…                    | Look at                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| A Persian label or error message     | `apps/web/lib/labels.ts` (error codes → Persian), or the page/component itself    |
| What the API accepts (validation)    | `packages/shared/src/schemas.ts` (used by API **and** web)                        |
| Loan rules (who can do what, tokens) | `apps/api/src/modules/circulation/loan-state-machine.ts` (pure, unit-tested)      |
| Loan side effects (DB, PIN, tokens)  | `apps/api/src/modules/circulation/circulation.service.ts`                         |
| Feed, filters, search                | `catalog.service.ts` + `catalog.repository.ts` (search is raw SQL with `pg_trgm`) |
| Who can see which user field         | `apps/api/src/modules/users/user.service.ts` (`toPublicUser` / `toPrivateUser`)   |
| Identity gate (add book / borrow)    | `users` service `assertVerified` / `assertCanBorrow`                              |
| Database tables                      | `schema.prisma`, then `pnpm db:migrate`                                           |
| Colours, theme                       | CSS variables in `apps/web/app/globals.css`, mapped in `tailwind.config.ts`       |
| Navigation (sidebar / mobile dock)   | `apps/web/components/app-shell.tsx`                                               |
| Toasts                               | `apps/web/lib/notify.tsx` (use `toast` from here, not from `sonner`)              |
| Barcode scanning                     | `apps/web/components/scanner.tsx` and `add-book-sheet.tsx`                        |
| Demo data                            | `apps/api/prisma/seed.ts`                                                         |

## Architecture rules

The API is a **modular monolith**. Each module in `apps/api/src/modules/<name>/` has:

- `*.repository.ts` – Prisma access only
- `*.service.ts` – business rules; its exported type is the module's **public interface**
- `*.routes.ts` – HTTP + Zod schemas (also generates the OpenAPI docs)
- `index.ts` – exports the factory, routes and types

Modules never import each other's repositories. They call each other's services, wired in `src/app.ts`. Dependencies flow one way: `users, circles → catalog → circulation → passport`. Operations that must be atomic across modules take an optional `tx` (Prisma transaction).

Errors are `{ "error": { "code", "message" } }` with stable English codes (`HttpError`). The web app translates codes in `lib/labels.ts`.

## Product rules worth knowing

- **Discovery is global.** `GET /feed` returns all available books except your own. `circleId`, `nearby`, `genre`, `condition`, `q` are optional filters.
- **Privacy.** Other users see only first name, `@username`, avatar, trust score and karma tokens. Last name, national code, phone and birth date are returned only to their owner. Public DTOs are built field by field; a unit test guards this.
- **Identity gate.** Without national code and birth date the API answers `IDENTITY_REQUIRED` for adding books and borrowing.
- **PIN handshake.** The person _handing over_ the book shows the PIN; the person _receiving_ it types it. Handover: lender shows, borrower enters. Return: borrower shows, lender enters. Five wrong attempts lock the loan.
- **Tokens.** `karma_tokens` is the spendable balance (starts at 1). Approving a loan deducts one from the borrower; returning restores it and pays the lender +1. Listing 2+ available books gives a one-time bonus token.
- **Overdue.** A sweep at boot and hourly marks `ACTIVE` loans past due as `OVERDUE` (−5 trust).
- **Locations are never exact.** Circles store a city and an optional geohash truncated to 5 characters.

Loan state machine:

```
REQUESTED ─APPROVE→ APPROVED ─HANDOVER→ ACTIVE ─RETURN→ RETURNED
    └────CANCEL────────┴→ CANCELLED       └─MARK_OVERDUE→ OVERDUE ─RETURN→ RETURNED
```

## API overview

Full, always-current reference: Swagger at `/docs`. Everything except `/auth/*`, `/avatars` and `/health` needs `Authorization: Bearer <jwt>`.

| Area     | Endpoints                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Auth     | `POST /auth/otp/request`, `POST /auth/otp/verify` (returns `registrationRequired` for new phones)            |
| Users    | `GET/PATCH /users/me`, `PATCH /users/me/identity`, `GET /users/:id`, `GET /avatars`                          |
| Discover | `GET /feed`, `GET /feed/random`, `GET /discover/overview`                                                    |
| Catalog  | `GET /books/isbn/:isbn`, `POST /copies`, `GET /copies/mine`, `GET/PATCH/DELETE /copies/:id`                  |
| Wishlist | `GET /wishlist`, `GET /wishlist/ids`, `PUT/DELETE /wishlist/:editionId`                                      |
| Loans    | `GET/POST /loans`, `GET /loans/:id`, `POST /loans/:id/approve\|handover\|return\|cancel`                     |
| External | `POST /external-loans`, `POST /external-loans/:id/return`                                                    |
| Passport | `GET/POST /copies/:id/passport`, `GET /passport/pending`                                                     |
| Circles  | `GET /circles`, `GET /circles/mine`, `POST /circles`, `POST /circles/join`, `DELETE /circles/:id/membership` |

## Data model

`users`, `circles`, `user_circles`, `book_editions`, `book_copies`, `loans`, `book_passport_entries`, `wishlist_items` (see `schema.prisma`). Notable details:

- `users` holds private identity fields (`first_name`, `last_name`, `national_id`, `phone_number`, `birth_date`) and `contact_hash` (HMAC of the phone, used for lookup).
- `book_editions.search_text` is a normalized (Persian-aware) blob indexed with `pg_trgm` and a generated `tsvector`. The app must set it when creating an edition (`buildSearchText` in `packages/shared`).
- A partial unique index (`loans_one_open_per_copy`) guarantees a copy has at most one approved/active loan.

**Migrations are partly hand-written.** The extension, trigram/FTS indexes, generated column, partial index and CHECK constraints live in the SQL files and are not expressed in `schema.prisma`. When you create a new migration, keep them intact.

## Environment variables

Copy `.env.example` to `.env` (git-ignored).

| Variable                                                                      | Purpose                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`, `REDIS_URL`                                                   | Postgres and Redis connections                                                       |
| `JWT_SECRET`                                                                  | JWT signing key (min 16 chars)                                                       |
| `CONTACT_HASH_PEPPER`                                                         | HMAC pepper for phone hashes                                                         |
| `CORS_ORIGIN`                                                                 | Allowed web origin(s), comma separated                                               |
| `DEV_FIXED_OTP`                                                               | Dev only: fixed login code that is also echoed by the API. Leave unset in production |
| `REQUIRE_INVITE`                                                              | `true` = sign-up needs a valid circle invite code                                    |
| `API_PORT`                                                                    | API port (default 4000)                                                              |
| `NEXT_PUBLIC_API_URL`                                                         | API URL used by the browser (build-time for web)                                     |
| `POSTGRES_PORT`, `REDIS_PORT`, `API_HOST_PORT`, `WEB_HOST_PORT`, `NODE_IMAGE` | Docker overrides (see above)                                                         |

## Testing and CI

- Unit tests: Vitest (`packages/shared`, `apps/api`). The loan state machine and the privacy of public DTOs are covered.
- `.github/workflows/ci.yml` – format check, typecheck and tests; web build; migrations + seed (twice) against a real Postgres.
- `.github/workflows/docker.yml` – builds and publishes `api` and `web` images to GHCR on `main` and `v*` tags.

## Gotchas

- Don't run `pnpm build` while `pnpm dev` is running; both use `apps/web/.next`. If the dev server shows "Cannot find module './NNN.js'", stop it, `rm -rf apps/web/.next`, restart.
- Camera scanning only works on `localhost` or HTTPS.
- Real SMS delivery is not implemented; `OtpSender` in `modules/auth` is the extension point (the default logs to the console).
- The OTP request/verify endpoints are rate-limited per phone in Redis. Run `redis-cli flushall` on your local Redis if you lock yourself out while testing.

## Known gaps

SMS delivery, push notifications, ESLint, API integration tests, web/e2e tests, a Jalali date picker (dates are typed as `YYYY/MM/DD`).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then browse the [issue board](https://github.com/mahanmntz/pa-varaq/issues) and look for the [`good first issue`](https://github.com/mahanmntz/pa-varaq/labels/good%20first%20issue) label. Only issues labelled `status:ready` can be taken, and the maintainer approves every change. Security reports go through [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
