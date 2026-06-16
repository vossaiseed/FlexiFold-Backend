# FlexiFold CRM — Backend (server)

Express + Supabase (Postgres) API for the FlexiFold CRM.

## Getting started
```bash
cp .env.example .env   # then fill in values
npm install
npm run dev
```

## Structure
- `src/config`     — Supabase client & env
- `supabase/`      — Postgres schema (schema.sql)
- `src/routes`     — Express route definitions
- `src/controllers`— request handlers
- `src/services`   — business logic
- `src/middleware` — auth, roles, validation, errors
- `src/validators` — request validation schemas
- `src/utils`      — helpers (tokens, responses, logging)
