Here’s a concrete implementation plan for the coding agent.

## 1) Target shape

Build a small two-part app:

* `web/`: Vite + React + AG Grid + TanStack Query
* `api/`: Fastify + Drizzle + SQLite
* `shared/`: Zod schemas, shared DTOs, column/editor metadata helpers

Use Vite only for the frontend app, Fastify for the backend API, and keep database access on the server side. Vite supports the React frontend flow, TanStack Query’s core model is queries/mutations/invalidation, Fastify has strong TypeScript support, and AG Grid supports editable cells plus both client-side and server-side row model families for later evolution. Drizzle supports SQLite via `better-sqlite3` and `libsql`, and for SQLite JSON storage it documents `text(..., { mode: 'json' })`. ([vitejs][1])

## 2) Decisions locked in

* Backend: **Fastify**
* ORM/DB: **Drizzle + local SQLite**
* Frontend: **Vite + React**
* Grid: **AG Grid**
* Server state: **TanStack Query**
* Tests: **Vitest + Playwright**
* Tables are defined in **Drizzle schema code only**
* Validation uses **shared Zod**
* v1 uses **client-side sort/filter/pagination**, but API and state should be shaped so server-side can replace it later
* v1 supports:

  * table switcher
  * inline cell edit
  * add row via modal/drawer
  * single-row delete with confirmation
  * immediate save default
  * toggle to explicit save mode
  * unsaved-cell highlighting in explicit mode
  * string / number / json / nullable fields only
  * JSON edit via formatted textarea modal
  * number/json validation on commit, not per keystroke

## 3) Repo layout

Use a simple folder layout:

```text
root/
  web/
  api/
  shared/
  package.json
```

Inside:

```text
web/
  src/
    app/
    components/
    features/tables/
    lib/
    routes/   # optional, can stay flat in v1
    test/

api/
  src/
    db/
      schema/
      migrations/
      generators/
    routes/
    services/
    plugins/
    lib/
    test/

shared/
  src/
    table-registry/
    schemas/
    dto/
    validation/
    metadata/
```

## 4) Core architecture

### 4.1 Table registry is the center of the app

Do **not** make the UI infer behavior from raw SQLite metadata.

Instead, create a shared `TableRegistry` derived from code-defined Drizzle tables plus Zod metadata. Each table entry should expose:

* table name
* display name
* Drizzle table object
* primary key field (`id`)
* ordered column definitions
* per-column UI kind:

  * `string`
  * `number`
  * `json`
* nullability
* Zod schema for create
* Zod schema for update
* editor config
* formatter config
* filter config

Shape:

```ts
type ColumnKind = 'string' | 'number' | 'json'

type ColumnMeta = {
  name: string
  label: string
  kind: ColumnKind
  nullable: boolean
  editable: boolean
  width?: number
}

type TableMeta = {
  name: string
  label: string
  primaryKey: 'id'
  columns: ColumnMeta[]
}
```

This keeps the app minimal now, but makes later custom editors, auth rules, and server-side operators easy to layer in.

### 4.2 API is table-generic but registry-backed

Expose generic routes like `/api/tables/:tableName/...`, but resolve table names only through the registry. That gives you a generic API shape without turning the backend into unsafe dynamic SQL.

### 4.3 Shared Zod is the validation source of truth

Put all create/update/patch schemas in `shared/` and use them:

* in Fastify request validation
* in API handlers before persistence
* in frontend commit validation before save
* in create-row modal submit validation

## 5) Initial DB schema

Create three example tables, all with single `id` primary keys.

### 5.1 `products`

Balanced mixed-type demo.

Columns:

* `id` integer primary key
* `name` string required
* `sku` string required
* `price` number required
* `discountRate` number nullable
* `metadata` json nullable

### 5.2 `wide_metrics`

Wider table for dense-grid and filter/sort testing.

Columns:

* `id`
* 6–10 required numeric/string columns
* 2 nullable numeric columns
* 1 nullable json column

### 5.3 `json_documents`

JSON-heavier table.

Columns:

* `id`
* `title` string required
* `category` string required
* `version` number required
* `payload` json required
* `notes` json nullable

Use Drizzle SQLite JSON columns with `text(..., { mode: 'json' }).$type<T>()`, because that is the documented pattern for SQLite JSON storage in Drizzle. ([Drizzle ORM][2])

## 6) API contract

### 6.1 Routes

Implement these routes:

* `GET /api/tables`

  * returns table list + lightweight schema summary for sidebar
* `GET /api/tables/:tableName/meta`

  * returns full `TableMeta`
* `GET /api/tables/:tableName/rows`

  * returns all rows for v1
  * accepts future-compatible params:

    * `page`
    * `pageSize`
    * `sort`
    * `filters`
  * v1 may ignore or only echo some params if doing client-side processing in web
* `POST /api/tables/:tableName/rows`

  * create row
* `PATCH /api/tables/:tableName/rows/:id`

  * patch row or single-cell update
* `DELETE /api/tables/:tableName/rows/:id`

  * delete row

### 6.2 Response conventions

Use a small envelope:

```ts
type ApiSuccess<T> = { ok: true; data: T }
type ApiError = { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string> } }
```

This makes toasts and field/cell errors easier.

### 6.3 Future-proofing for server-side data ops

Even though v1 does client-side sort/filter/pagination, keep request/response DTOs ready for server-side later:

```ts
type GridQuery = {
  page?: number
  pageSize?: number
  sort?: Array<{ col: string; dir: 'asc' | 'desc' }>
  filters?: Record<string, unknown>
}
```

That way the API contract does not need to break later when you move from AG Grid’s client-side row model to server-side-backed fetching. AG Grid explicitly separates client-side and server-side/infinite row model approaches, so this is the right seam to preserve. ([AG Grid][3])

## 7) Frontend UI plan

### 7.1 Layout

Dense internal-tool layout:

* left sidebar

  * table list/tree
  * each item expands to quick schema summary (`colName: type?`)
* top toolbar

  * selected table name
  * save mode toggle: `Immediate` / `Explicit`
  * add row button
  * refresh button
* main panel

  * AG Grid
* bottom or floating status area

  * unsaved count in explicit mode
  * save/discard actions in explicit mode

### 7.2 Table switcher behavior

* switching tables keeps per-table:

  * filters
  * sort
  * pagination page
* in explicit mode, if current table has unsaved changes:

  * warn
  * on confirm, discard edits and switch
* store per-table view state in a local store keyed by table name

### 7.3 Grid setup

Start with AG Grid client-side row model.

Use:

* editable columns
* multi-column sort if easy
* client-side filter model for:

  * string contains
  * number range
  * null/non-null
* pagination in grid or app state
* custom cell renderers/editors per column kind

AG Grid’s default client-side row model supports client-side sorting/filtering once all data is loaded, and it only renders visible rows via DOM virtualisation, which is a good fit for your first pass. AG Grid also supports custom cell editor components, which is the extension point you want for later custom per-type editors. ([AG Grid][3])

## 8) Editor architecture

Make editors pluggable from day one, but keep only 3 real implementations.

### 8.1 Editor contract

```ts
type CellEditorSpec = {
  kind: ColumnKind
  renderCell: ...
  renderEditor: ...
  parseDraft: ...
  validateCommit: ...
  formatDisplay: ...
}
```

Registry:

```ts
const editorRegistry: Record<ColumnKind, CellEditorSpec>
```

### 8.2 Editors to implement

#### String editor

* plain text input
* empty string allowed unless schema rejects it

#### Number editor

* text input while editing
* draft may be invalid while typing
* validate on commit only
* allow:

  * decimals
  * negatives
  * scientific notation
* empty input maps to `null` only if nullable, otherwise validation error

#### JSON editor

* edit opens modal
* formatted textarea
* pretty-print existing JSON on open
* draft may be invalid while typing
* validate on commit only with Zod + `JSON.parse`
* empty input maps to `null` only if nullable, otherwise validation error
* grid cell displays compact preview

### 8.3 Invalid commit behavior

For number/json:

* keep invalid draft visible in editor state
* show error styling
* show toast
* do not persist
* if immediate mode, saved value remains unchanged until valid commit
* if explicit mode, invalid cells stay staged with error markers and are excluded from save until fixed

## 9) Save-mode model

Implement a **single edit pipeline** with two persistence modes.

### 9.1 Immediate save mode

Flow:

1. user commits valid edit
2. local cache updates optimistically
3. mutation fires
4. on failure:

   * rollback
   * toast error

### 9.2 Explicit save mode

Flow:

1. user commits valid edit
2. local staged patch map updates
3. cell gets dirty highlight
4. save button applies staged row patches in sequence or batched API calls
5. on success:

   * clear dirty markers
6. on failure:

   * rollback failed cell/row to saved value
   * toast error

### 9.3 Dirty state structure

Maintain:

```ts
type DirtyCellMap = Record<tableName, Record<rowId, Record<columnName, unknown>>>
type ValidationErrorMap = Record<tableName, Record<rowId, Record<columnName, string>>>
```

This choice also keeps the door open for future bulk edit because the app already understands “pending edits as a patch layer,” even though bulk edit UI is not implemented now.

## 10) TanStack Query usage

Use TanStack Query for server state only.

### Queries

* `['tables']`
* `['tableMeta', tableName]`
* `['tableRows', tableName]`

### Mutations

* create row
* update row / cell
* delete row

### Behavior

* use optimistic updates for immediate-save cell edits
* invalidate/refetch after create/delete
* in explicit mode, keep staged edits outside Query cache until save
* remember per-table UI state separately from Query cache

TanStack Query’s core model is queries, mutations, and invalidation; that maps cleanly to this CRUD editor. ([TanStack][4])

## 11) Data flow details

### 11.1 Load flow

* fetch table list
* select default table
* fetch meta + rows for that table
* build AG Grid column defs from `TableMeta`

### 11.2 Edit flow

* AG Grid editor returns draft
* shared validator parses/validates
* if valid:

  * immediate mode: mutate now
  * explicit mode: stage patch
* if invalid:

  * keep invalid draft state
  * show inline error + toast

### 11.3 Create-row flow

* open modal/drawer
* render fields from `TableMeta`
* all fields start empty
* validate on save
* on success:

  * close modal
  * insert row
  * invalidate or update cache

### 11.4 Delete-row flow

* row action opens confirm dialog
* confirm calls delete mutation
* on success refetch/update cache

## 12) DB generation runner

You asked for a simple runner shape:

```bash
npm run db:generate DB_NAME SCRIPT_NAME [...SCRIPT ARGS]
```

Implement exactly that.

### 12.1 Runner responsibilities

* resolve DB file path from `DB_NAME`
* warn if DB already exists
* require confirmation or `--force`
* create/overwrite DB
* run migrations
* load and execute arbitrary generator script path
* pass through remaining CLI args untouched

### 12.2 Example usage

```bash
npm run db:generate demo.db ./api/src/db/generators/basic.ts --rows 100
npm run db:generate big.db ./api/src/db/generators/wide.ts --rows 10000 --seed 42
npm run db:generate json.db ./api/src/db/generators/json-heavy.ts --rows 500 --depth 3
```

### 12.3 Generator contract

```ts
export type GeneratorContext = {
  db: DrizzleDb
  faker?: ...
  seed: number
  logger: ...
}

export async function run(ctx: GeneratorContext, args: string[]): Promise<void>
```

### 12.4 Starter generator scripts

* `basic.ts`
* `wide.ts`
* `json-heavy.ts`

Each script parses its own flags.

## 13) Testing plan

### 13.1 Unit tests with Vitest

Use Vitest for:

* shared Zod validators
* number parse/validate helpers
* JSON parse/format helpers
* table registry metadata
* dirty-state reducers / patch maps
* API DTO mapping helpers

Vitest is Vite-native and configured through Vite/Vitest config, which fits this repo well. ([Vitest][5])

### 13.2 API integration tests with Vitest

Spin up Fastify app against a temporary SQLite DB and test:

* list tables
* get meta
* list rows
* create valid row
* reject invalid create
* patch valid number/json
* reject invalid number/json
* delete row
* overwrite-warning behavior in DB generator runner

### 13.3 UI/e2e tests with Playwright

Use Playwright for:

* switching tables
* editing a number cell successfully
* rejecting invalid number input
* editing JSON through modal
* explicit save mode dirty-cell highlight
* warning on unsaved changes when switching tables
* add row flow
* delete row confirmation

Playwright Test bundles runner/assertions/isolation and is designed for modern web apps, which is enough for this use case. ([Playwright][6])

## 14) Implementation order for the coding agent

### Phase 1: repo and tooling

1. create `web/`, `api/`, `shared/`
2. set up workspace scripts
3. set up TypeScript configs
4. set up Vite in `web/`
5. set up Fastify in `api/`
6. set up Vitest and Playwright
7. add lint/format scripts
8. pin Node version compatible with current Vite requirements

Vite currently requires Node 20.19+ or 22.12+. ([vitejs][1])

### Phase 2: shared contracts

1. create `ColumnKind`, `ColumnMeta`, `TableMeta`
2. create grid query DTOs
3. create API envelope types
4. create Zod helpers for number/json commit validation
5. create table registry interfaces

### Phase 3: DB and schema

1. add Drizzle SQLite setup
2. create three schema tables
3. add migrations
4. add shared table registry definitions
5. implement DB generator runner
6. add three generator scripts

### Phase 4: API

1. bootstrap Fastify app
2. register DB plugin
3. implement `/tables`
4. implement `/tables/:table/meta`
5. implement `/tables/:table/rows`
6. implement create/patch/delete routes
7. validate all inputs with shared Zod
8. add integration tests

### Phase 5: frontend foundation

1. add TanStack Query provider
2. create API client
3. create table list query hook
4. create table meta/rows query hooks
5. create sidebar + toolbar shell
6. add toasts + confirmation dialog primitive

### Phase 6: grid and editors

1. build AG Grid wrapper
2. map `TableMeta` -> column defs
3. implement string editor
4. implement number editor with commit validation
5. implement JSON modal editor with formatted textarea
6. implement compact JSON preview renderer
7. implement per-cell error highlighting

### Phase 7: edit flows

1. immediate save mode
2. explicit save mode
3. dirty cell state + diff color
4. unsaved-change warning on table switch
5. rollback on failed save
6. per-table state persistence for filters/sort/page

### Phase 8: row create/delete flows

1. add-row modal/drawer
2. generated form from `TableMeta`
3. delete confirmation
4. cache updates / invalidation

### Phase 9: polish and tests

1. dense styling cleanup
2. Playwright happy-path coverage
3. invalid-number / invalid-json UI tests
4. README with commands and architecture notes

## 15) Package scripts

At root:

```json
{
  "scripts": {
    "dev": "...",
    "dev:web": "...",
    "dev:api": "...",
    "build": "...",
    "test": "...",
    "test:unit": "...",
    "test:api": "...",
    "test:e2e": "...",
    "db:migrate": "...",
    "db:generate": "node ./api/scripts/db-generate.mjs"
  }
}
```

Keep the runner simple: it should parse only `DB_NAME` and `SCRIPT_NAME`, then pass the rest through.

## 16) Acceptance criteria

The coding agent is done when all of these work:

* app boots with one command for web and one for api
* sidebar shows 3 tables
* expanding a table reveals quick `name:type` schema info
* selecting a table loads rows and schema-driven columns
* string/number/json columns render correctly
* number input accepts decimals, negatives, scientific notation
* invalid number commit is blocked with error highlight + toast
* JSON edit happens in modal with formatted textarea
* invalid JSON commit is blocked with error highlight + toast
* nullable fields can be set by clearing input
* add row works through modal/drawer
* delete row requires confirmation
* immediate save works with rollback on failure
* explicit save mode stages changes and highlights dirty cells
* switching tables preserves filter/sort/pagination
* switching away with unsaved changes warns and discards on confirm
* generator runner can create named DB files and warns before overwrite
* unit tests, API integration tests, and at least one Playwright happy-path test pass

## 17) One important implementation bias

For v1, prefer **schema-driven simplicity over database introspection cleverness**.

That means:

* table registry defines what is editable
* frontend trusts shared metadata
* backend trusts registry + Zod
* SQLite is just persistence, not the place where the UI discovers meaning

That gives you the cleanest path to later:

* custom editors per column type
* auth rules
* server-side filtering/pagination
* more field types
* Postgres migration if needed

If you want, I can turn this into a coding-agent-ready checklist prompt with explicit file targets and milestones.

[1]: https://vite.dev/guide/?utm_source=chatgpt.com "Getting Started"
[2]: https://orm.drizzle.team/docs/column-types/sqlite?utm_source=chatgpt.com "SQLite column types - Drizzle ORM"
[3]: https://www.ag-grid.com/react-data-grid/row-models/?utm_source=chatgpt.com "React Grid: Row Models"
[4]: https://tanstack.com/query/v5/docs/react/quick-start?utm_source=chatgpt.com "Quick Start | TanStack Query React Docs"
[5]: https://vitest.dev/guide/?utm_source=chatgpt.com "Getting Started | Guide"
[6]: https://playwright.dev/docs/intro?utm_source=chatgpt.com "Installation"
