# SimpleInvoice

A full-stack invoicing app: ReactJS (TypeScript, Tailwind, shadcn-style UI) frontend + NestJS (TypeScript) backend + PostgreSQL, built for the 101 Digital Full Stack Assessment.

## Architecture

Monorepo, two independently deployable apps:

```
simple-invoice/
├── frontend/     # React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn-style components
├── backend/      # NestJS + TypeORM + PostgreSQL, JWT auth, Swagger docs
└── docker-compose.yml
```

- **Backend**: NestJS modules `auth`, `users`, `invoices`, `database/seed`. JWT auth via `@nestjs/passport` + `passport-jwt`. Validation via `class-validator`/`class-transformer` (global `ValidationPipe`). Global exception filter normalizes all error responses. Swagger/OpenAPI at `/api/docs`.
- **Frontend**: React Router for navigation, TanStack Query for server state/caching, react-hook-form + zod for form validation, axios with a request interceptor that attaches the JWT and a response interceptor that redirects to `/login` on 401.
- **Database**: PostgreSQL. `Invoice` and `InvoiceItem` are separate tables (one item per invoice for this assessment, per spec); `Customer` is embedded directly on `Invoice` (see Assumptions).

## Quick Start (Docker — recommended)

Requires Docker + Docker Compose only.

```bash
docker compose up --build
```

This starts Postgres, runs the seed script automatically, starts the API, and serves the built frontend via Nginx.

| Service  | URL                                                    |
| -------- | ------------------------------------------------------- |
| Frontend | http://localhost:5173                                   |
| Backend  | http://localhost:3001                                   |
| Swagger  | http://localhost:3001/api/docs                          |
| Postgres | localhost:5432 (db: `simple_invoice`, user/pass: `postgres`/`postgres`) |

**Reviewer login:** `admin@simpleinvoice.com` / `Password123!`

> The backend container re-runs the seed script on every start (`npm run seed && node dist/main.js`), which truncates and repopulates invoice data. This guarantees a reviewer always sees a full, working dataset with a single `docker compose up`, at the cost of not persisting invoices you create between container restarts. See [Known Limitations](#known-limitations).

## Quick Start (without Docker)

Requires Node.js 20+ and a local PostgreSQL instance.

**1. Database**

Create a database named `simple_invoice` (or start Postgres via `docker compose up -d postgres` and skip local install).

**2. Backend**

```bash
cd backend
cp .env.example .env   # edit DB_* values if needed
npm install
npm run seed            # seeds reviewer user + ~40 sample invoices
npm run start:dev       # http://localhost:3001, Swagger at /api/docs
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL defaults to http://localhost:3001
npm install
npm run dev              # http://localhost:5173
```

**Reviewer login:** `admin@simpleinvoice.com` / `Password123!`

## Running Tests

```bash
# Backend unit tests (no DB required)
cd backend && npm test

# Backend e2e test (requires Postgres running — e.g. `docker compose up -d postgres`)
cd backend && npm run test:e2e

# Frontend unit/component tests
cd frontend && npm test
```

Backend unit tests cover: invoice total calculation, Overdue status derivation, due-date validation, and unique invoice-number enforcement (`src/invoices/invoices.service.spec.ts`, `src/invoices/validators/*.spec.ts`), plus JWT login flows (`src/auth/auth.service.spec.ts`). The e2e test (`test/app.e2e-spec.ts`) exercises the full create-invoice → appears-in-list workflow against a real database, plus auth guarding and duplicate/validation rejections.

Frontend tests cover the login form (validation + success/error paths), the create-invoice form's due-date business rule, and the status badge component.

## Design Decisions & Assumptions

- **Customer embedded on Invoice**: the spec allows either approach; embedded fields were chosen since each invoice's customer isn't reused elsewhere in this assessment's scope, keeping the schema and queries simpler.
- **`bcryptjs` instead of `bcrypt`**: pure-JS, no native compilation step — removes a common source of "works on my machine" setup failures for reviewers across OSes/architectures.
- **`synchronize: true` (TypeORM)**: acceptable for an assessment-scale app; a production system would use migrations instead.
- **Overdue derivation**: never persisted. Computed at read time as `status != 'Paid' AND dueDate < today`, per spec — this also means a `Draft` invoice past its due date is reported as `Overdue`, matching the literal business rule given.
- **Auto-seed on every container start**: prioritizes "always works, single command" for a reviewer over data persistence across restarts (see limitation below).
- **JWT expiry**: configurable via `JWT_EXPIRES_IN` (seconds), defaults to 3600.

## Known Limitations

- Seeding truncates and regenerates invoice data on every `docker compose up` restart of the backend container — invoices created during a review session won't survive a container restart. Running the backend outside Docker (`npm run start:dev`) does not have this behavior; seeding is then a one-time manual step (`npm run seed`).
- No password reset / MFA / account management flows (explicitly out of scope per spec).
- No refresh-token rotation — a single JWT access token is used, matching the spec's stateless-session requirement.
- Each invoice supports exactly one line item, per spec; the schema (separate `invoice_items` table) already supports multiple items for future extension.
- No rate limiting or audit logging.
