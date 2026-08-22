# CRM Dashboard

Customer management dashboard — searchable table, advanced filters with saved
presets, full CRUD, bulk import from Excel, drag-and-drop reordering.

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · TanStack Query ·
Prisma 7 + Postgres · Better Auth · dnd-kit · zod

## Setup

Needs Node 20+ and a Postgres database ([Neon](https://neon.tech) free tier is
fine).

```bash
npm install
cp .env.example .env    # fill it in — see below
npm run db:migrate
npm run db:seed         # 50 customers + 3 filter templates
npm run dev
```

### Environment

| Variable                                    | What it is                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Neon **pooled** connection string (host contains `-pooler`)                      |
| `DIRECT_URL`                                | Neon **direct** string — migrations need it, PgBouncer can't run the DDL         |
| `BETTER_AUTH_SECRET`                        | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → OAuth client ID                             |
| `ISALLOWAUTH`                               | `"true"` lets any Google account in. Anything else falls back to the list below  |
| `AUTH_ALLOWED_EMAILS`                       | Comma-separated: `you@gmail.com` or `@company.com`                               |

Add this exact redirect URI to your Google OAuth client, or sign-in fails with
`redirect_uri_mismatch`:

```
http://localhost:3000/api/auth/callback/google
```

For local development, put your own address in `AUTH_ALLOWED_EMAILS` and leave
`ISALLOWAUTH` alone. Turning it on means anyone who finds the URL can sign in
and edit data.

`npm run db:health` checks the database is reachable on the pooled connection —
the path the app actually uses.

## Structure

```
src/
  app/            routes only
  features/
    auth/         sign-in, session guards, allowlist
    customers/    table, CRUD, bulk import, query builder, schemas
    filters/      filter panel, saved filters, drag-and-drop
  components/     layout, providers, ui (shadcn)
  hooks/          use-debounce
  lib/            prisma, query keys, cn
```

Grouped by feature, not by file type. Components are PascalCase, everything
else kebab-case.

## Decisions

**Five statuses, not two.** The brief's text says Active/Inactive; the
screenshots show five. I followed the screenshots — a checkbox filter over two
mutually exclusive values makes no sense. Stored as a Postgres enum.

**Filtering runs in SQL.** The client only ever gets one page.
`buildCustomerWhere` is pure and database-free so the filter logic can be
tested on its own. All conditions go into one `AND`, which is what makes search
and the five filters narrow together instead of overriding each other.

**Server actions return a result object instead of throwing.** Failed
validation is something the form has to render, not an exception.
`fieldErrors` comes from zod's `flatten()`, so a duplicate email lands under
the email input. Real faults still throw.

**Auth is checked twice.** `proxy.ts` only looks for a session cookie — cheap,
but a cookie isn't proof, so it's routing not security. `requireSession()` does
the real check against the database on every protected page and re-applies the
allowlist there, so revoking access takes effect immediately.

**Both auth gates fail closed.** `ISALLOWAUTH` only opens when set to `true` or
`1`; a typo leaves it shut. With it off, an empty `AUTH_ALLOWED_EMAILS` rejects
everyone rather than admitting everyone.

**Saved filters don't store sorting.** A saved filter is a set of filters, not
a whole view — including sort would silently change the column you'd sorted by.
Applying one replaces the current filters rather than merging, since merging
produces a combination nobody saved.

**Drag-and-drop reorders saved filters, not table rows.** The brief allows any
of three targets. Reordering rows fights server-side sorting and pagination —
"drag row 3 above row 1" means nothing in an alphabetical list, and you can't
drag across pages. dnd-kit with keyboard support; no native HTML5 drag.

**Bulk import skips duplicates and imports partial sheets.** Existing emails are
reported, never overwritten. Valid rows still import when others fail, and each
rejected row comes back with its row number and reason. Parsing runs on the
server so rows go through the same schema as the form.

**Sorting is a select, not clickable headers.** Making "newest first" an
explicit promise exposed a bug worth remembering: Postgres sorts NULLs first on
`DESC`, so never-contacted customers were topping "most recently contacted".
The query builder now pins nulls last.

## Known limitations

- **Phone filter matches the stored string.** `555` works, `5551234567` won't
  match `+1 (555) 123-4567`. Proper fix is a normalised `phoneDigits` column.
- **"Recent Contacts" drifts.** It stores an absolute date computed at seed
  time. Re-seeding refreshes it; the real fix is a relative marker resolved at
  apply time.
- **Email sorting isn't exposed.** The API supports it; the select offers name
  and last contact only.
- **No committed tests.** Everything was verified against the real database
  with throwaway scripts — filter composition, pagination boundaries, date
  ranges, import round-trips, reorder persistence. `buildCustomerWhere` is pure
  and is the obvious first thing to cover with Vitest.
- **`npm audit` flags `exceljs` → `uuid` (moderate).** Not on any path used
  here. Chosen over `xlsx`, which is pinned at 0.18.5 with unpatched
  prototype-pollution and ReDoS advisories.
- **One shared workspace.** No `ownerId`; every signed-in user sees the same
  customers.

## Next

Bulk actions on the table, CSV export, dark mode toggle (tokens already exist
in `globals.css`), Cmd+K for the filter panel, then a Vitest suite over the
query builder and import parser.

## Scripts

|                                   |                               |
| --------------------------------- | ----------------------------- |
| `npm run dev`                     | development server            |
| `npm run build`                   | production build              |
| `npm run db:migrate`              | apply migrations              |
| `npm run db:seed`                 | 50 customers seed data        |
| `npm run db:studio`               | Prisma Studio                 |
| `npm run db:health`               | check the database connection |
| `npm run lint` / `npm run format` | ESLint / Prettier             |
