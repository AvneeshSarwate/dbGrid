# dbGrid

An editable data grid UI backed by SQLite — built for fast UI iteration on database editing workflows, architected to be extended to other backends and server-side features.

## Getting Started

```bash
npm install
npm run db:generate demo.db ./api/src/db/generators/basic.ts --rows 50
npm run dev:api    # starts API on port 3001
npm run dev:web    # starts frontend on port 5173
```

## Running Tests

```bash
npm run test:unit  # shared package unit tests
npm run test:api   # API route tests
```

## Architecture

The project is a monorepo with three workspaces:

- **`web/`** — React frontend using AG Grid for the editable table UI, TanStack Query for server state management, and Vite for dev/build.
- **`api/`** — Fastify server exposing REST endpoints for table metadata, row CRUD, and cell-level updates. Uses Drizzle ORM with better-sqlite3.
- **`shared/`** — Zod schemas, DTOs, validation logic, column metadata helpers, and a table registry shared between client and server.

The frontend does client-side sort/filter/pagination in v1, but the API and state layer are shaped so server-side processing can replace it later.

See [implementation_plan.md](./implementation_plan.md) for deeper design decisions and rationale.
