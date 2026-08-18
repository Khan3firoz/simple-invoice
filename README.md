# SimpleInvoice

A full-stack invoice management app: authenticate, list/search/filter/sort invoices, view invoice detail, and create new invoices.

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui (Radix)
- **Backend:** NestJS + TypeScript, TypeORM, PostgreSQL, JWT auth
- **Repo layout:** monorepo (`frontend/`, `backend/`), single `docker-compose.yml` at the root

## Architecture

```
simple-invoice/
├── frontend/               React SPA (Vite)
│   └── src/
│       ├── features/auth/       login, session, protected routes
│       ├── features/invoices/   list / detail / create pages + components
│       ├── components/ui/       shadcn primitives
│       └── lib/api/             axios client, typed API calls
├── backend/                 NestJS REST API
│   └── src/
│       ├── auth/                 JWT login, guard, strategy
│       ├── invoices/              CRUD, search/filter/sort/pagination, business logic
│       ├── database/seed/         seed script + fixture data
│       └── common/                global exception filter, shared DTOs, validators
└── docker-compose.yml       postgres + backend + frontend
```

**Auth:** stateless JWT. The client stores the access token in `localStorage` and attaches it as a `Bearer` header via an axios interceptor; a `401` response clears the session and routes back to `/login`.

**Business logic:** all money calculations (`subTotal`, `taxAmount`, `totalAmount`, `balanceAmount`) happen server-side in `InvoicesService`, never on the client. `Overdue` is a **derived** status — it is never written to the database (`status` column only ever holds `Draft`/`Pending`/`Paid`); it's computed at read time from `dueDate` vs. today, and the same derivation is mirrored in the list endpoint's status filter so what you filter by matches what you see.

## Running locally

### With Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres, the API, and the frontend together. First run only — seed the database:

```bash
docker compose exec backend npm run seed
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger docs | http://localhost:3000/api/docs |
| Postgres | localhost:5432 |

### Without Docker

Requires Node.js 24+ and a local PostgreSQL instance.

**Backend:**

```bash
cd backend
cp .env.example .env   # edit DB_* if your Postgres differs from the defaults
npm install
npm run seed            # populates the reviewer account + sample invoices
npm run start:dev       # http://localhost:3000, docs at /api/docs
```

**Frontend** (in a second terminal):

```bash
cd frontend
cp .env.example .env    # VITE_API_BASE_URL, defaults to http://localhost:3000
npm install
npm run dev              # http://localhost:5173 (or next free port)
```

### Reviewer login

Seeded by `npm run seed` (or `docker compose exec backend npm run seed`):

```
email:    admin@simpleinvoice.io
password: Password123!
```

Override via `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` env vars before seeding if you want different credentials.

## Testing

```bash
# backend — unit tests
cd backend && npm test

# backend — e2e (needs a reachable, seeded Postgres — see .env)
cd backend && npm run test:e2e

# frontend
cd frontend && npm test
```

Backend unit tests cover invoice total calculation, Overdue derivation, due-date validation, and unique invoice-number handling. The e2e suite drives the full create → list → detail flow through real HTTP requests. Frontend tests cover the login form (validation/success/error paths), the invoice list (rendering, sort, filter, pagination), the detail page (data render + 404), and the create form (validation, computed totals, submit mapping, duplicate-number handling).

## Assumptions & design decisions

- **Customer is embedded on the Invoice row**, not a separate `customers` table — nothing in this app queries "all invoices for a customer," so a join wasn't worth the extra complexity. Noted as a documented trade-off per the spec's data model guidance.
- **Multiple line items per invoice** — this also deviates from the assessment spec, which only required one. The schema (`invoice_items` as its own table, FK'd to `invoices`) was already designed for it; `POST /invoices` now takes an `items` array (min 1) instead of a single `item`, `calculateTotals` sums `quantity * rate` across every item before applying tax/discount, and the create form supports adding/removing item rows.
- **Reviewer/session token stored in `localStorage`**, not an httpOnly cookie. Simpler for a SPA talking to a separately-hosted API with no shared domain; a production system handling sensitive data would likely move to httpOnly cookies + CSRF protection instead.
- **List endpoint doesn't join invoice items.** A `leftJoinAndSelect` on a one-to-many relation combined with `skip/take` pagination duplicates rows and corrupts the count once an invoice can have more than one item — and the list view doesn't need item detail anyway (only the detail endpoint loads items).
- **Currency is a fixed short list** (AUD, USD, GBP, SGD, EUR) in the create-invoice UI for simplicity; the backend accepts any non-empty currency/symbol pair.
- **bcryptjs instead of bcrypt** — avoids native-module compilation issues across Windows/Docker/CI, at a small performance cost that doesn't matter at this scale.
- **Customer email is optional**, not required. This intentionally deviates from the assessment spec's "Customer email: Required, valid email format" rule — the format is still validated when an email *is* provided (client and server), it just isn't mandatory to submit an invoice.

## Known limitations

- No pagination/filter state in the URL — refreshing the invoice list resets filters. Would add next via `useSearchParams`.
- No edit/delete/void invoice flows — out of scope per the assessment spec (Draft/Pending/Paid transitions and payments aren't modeled).
- No refresh-token flow; a token simply expires after `JWT_EXPIRES_IN` seconds (default 3600) and the user is prompted to log in again.
- Frontend bundle isn't code-split (single ~600KB JS chunk); fine at this app's size, would revisit with route-based `lazy()` if it grew.
- No rate limiting / brute-force protection on `/auth/login`.
