# Deployment

This app is a standard Next.js 16 app (Node.js runtime) with a **PostgreSQL**
database accessed via raw SQL (`pg`), no Prisma Client/engines involved. Any
host that runs Node.js and can reach a Postgres instance will work.

## 1. Provision a database

You need a real, network-reachable PostgreSQL instance (local Postgres, as
used in development, will **not** work once deployed). Options: a managed
Postgres from your hosting provider, or a dedicated service (Neon, Supabase,
Railway, RDS, etc.).

Once you have a connection string, apply the schema:

```bash
psql "<your DATABASE_URL>" -f prisma/init.sql
```

This creates all tables, enums, and constraints. It's safe to run once
against a fresh, empty database — re-running it against a non-empty database
will fail (tables already exist), which is a useful safety check.

## 2. Set environment variables

Copy `.env.example` to `.env` (or set these directly in your host's
environment variable settings) and fill in real values:

- `DATABASE_URL` — the connection string from step 1.
- `JWT_SECRET` — a long random string (`openssl rand -base64 48`). Sessions
  are signed with this; changing it logs everyone out.
- `ADMIN_SIGNUP_SECRET` — the one-time code required on the Admin signup
  form. Use it once to create the first Admin account, then optionally
  rotate it to something else so the signup form can't create more admins
  without your involvement.
- `BLOB_READ_WRITE_TOKEN` — **required on Vercel** (or any serverless host
  with an ephemeral/read-only filesystem) for staff photo uploads to work.
  Add the "Blob" storage integration in your Vercel project's Storage tab —
  it sets this env var for you automatically. Not needed for Option A/B
  below (Node server or Docker), where uploads are written to local disk
  under `public/uploads/staff` instead.

## 3. Build and run

### Option A — Plain Node.js server

```bash
npm ci
npm run build
npm run start
```

`next start` serves on port 3000 by default (respects `PORT` if your host
sets one).

### Option B — Docker

```bash
docker build -t afya-nyumbani-erp .
docker run -p 3000:3000 --env-file .env afya-nyumbani-erp
```

The `Dockerfile` uses Next's `output: "standalone"` build, so the resulting
image only contains the compiled app and its runtime dependencies (not the
full `node_modules`/devDependencies).

### Option C — Vercel (or similar serverless platform)

Works as long as `DATABASE_URL` points to a database reachable from the
platform's network (i.e. not `localhost`) — a managed/hosted Postgres, not
the local instance used in development. PDF generation
(`@react-pdf/renderer`) needs the Node.js runtime, which is the default for
route handlers in this app — no extra configuration needed.

## 4. First login

Visit `/register`, choose the **Admin** tab, and sign up using the
`ADMIN_SIGNUP_SECRET` you set in step 2. That becomes the first Admin
account. From there, use `/staff` to add the rest of the team, or approve
Staff who self-register.

## Notes

- `prisma/init.sql` is the single source of truth for the schema — there is
  no separate migration history. If you change the schema later, write the
  `ALTER TABLE`/`CREATE ...` statements by hand, apply them to the live
  database, and mirror the same change in `prisma/init.sql` so a fresh
  install stays in sync (this is the pattern used throughout this project).
- Staff photo upload uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set,
  local disk otherwise. Patient documents are still metadata-only (no file
  upload) — add an object storage integration if you need that too.
