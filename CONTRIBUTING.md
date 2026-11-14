# Contributing

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first; the game design is in
[docs/DESIGN_V2.md](docs/DESIGN_V2.md) (direction) and [docs/DESIGN.md](docs/DESIGN.md) (engine formulas).

## Setup

Node 20+ (CI uses 22).

```bash
npm install
npm run dev
```

## Before you push

```bash
npm run check
```

That runs everything CI runs except the browser tests: formatting, lint, type checks, unit tests
with coverage floors, the production build, the bundle budget and the balance baseline. Add
the UI smoke tests with:

```bash
npm run check:all
```

| Command                              | What it does                                                             |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `npm run format`                     | Prettier, in place                                                       |
| `npm run lint`                       | ESLint (TypeScript, React hooks, layer boundaries)                       |
| `npm run typecheck`                  | `tsc` over the app, tests, scripts and configs                           |
| `npm test` / `npm run test:coverage` | Vitest unit tests (coverage floors in `vite.config.ts`)                  |
| `npm run e2e`                        | Playwright UI smoke tests against the production build (desktop + phone) |
| `npm run sim -- 200`                 | The full balance report (slow, informational)                            |
| `npm run balance`                    | The fixed-seed balance baseline check (fast; CI)                         |
| `npm run balance:update`             | Re-record the baseline after an intended balance change                  |
| `npm run bundle`                     | Gzip bundle budget (after `npm run build`)                               |

## Rules of the road

- **Engine stays pure.** No React, DOM, storage, `Date.now()` or `Math.random()` in `src/engine`;
  use the state's `Rng`. Same seed and actions must always give the same game.
- **Every action is validated in `validate.ts`.** A new action type won't compile until it has
  a case there and an invalid example in `validate.test.ts`.
- **Illegal moves throw `GameError`** (via `reject(message)`); bugs throw anything else.
- **Content is data.** New cards, people, items or scenarios go in `src/data`; if a new effect
  needs code, keep the data field generic and the code in the system's module.
- **Changing `GameState`?** Bump `SCHEMA_VERSION` and add a migration step (see ARCHITECTURE).
- **Changing balance?** Run `npm run balance`. If metrics move on purpose, run
  `npm run balance:update` and commit `balance/baseline.json` with the change, explaining why in
  the commit message. Targets live in DESIGN_V2.
- **Tests:** engine changes come with unit tests; anything a player clicks through should keep
  the Playwright smoke tests green.

## Budgets

| Budget                           | Limit                                                 | Where                      |
| -------------------------------- | ----------------------------------------------------- | -------------------------- |
| Engine cost per turn             | < 5 ms on a dev machine (~50 ms on a mid-range phone) | `src/engine/perf.test.ts`  |
| Save size after 60 turns         | < 300 KB                                              | `src/engine/perf.test.ts`  |
| JS bundle                        | ≤ 160 KB gzip                                         | `scripts/check-bundle.mjs` |
| CSS                              | ≤ 12 KB gzip                                          | `scripts/check-bundle.mjs` |
| Coverage (engine, data, storage) | statements 90 · branches 84 · functions 90 · lines 93 | `vite.config.ts`           |

## Known issues

- `npm audit` reports a moderate ReDoS advisory in `minimatch`, pulled in by
  `typescript-eslint` (lint tooling only, not shipped to players). There is no non-breaking fix
  yet; revisit when typescript-eslint updates.
