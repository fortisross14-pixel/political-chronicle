# Political Chronicle

A card-driven political career simulator. Create a politician, run as an independent
for mayor, then climb through the House, Senate and Governor's office while balancing what
your voters want against what your party wants. Every career is recorded so runs can be
compared.

- [Design v2 — the game we're building](docs/DESIGN_V2.md)
- [Design v1 — simulation engine](docs/DESIGN.md)
- [POC milestones](docs/MILESTONES.md)

Status: **M10 (scenarios, meta-progression & run results) done** — a menu with Scenarios
(4 beginner missions with objectives, deadlines and stars), Sandbox (unlocked by the beginner
track; choose artifacts, abilities and career length), run results with a legacy score and
charts, and the Hall of Runs to compare careers. Next: M11 (development best practices), then
M12 visual revamp and M13 balancing.

## Development

Requires Node 20+.

```bash
npm install
npm run dev        # local dev server
npm run check      # typecheck + tests + production build (what CI runs)
npm run sim        # balance harness: bot win rates (optional arg: runs, default 200)
```

Layout:

- `src/engine/` — pure TypeScript game rules (no React): types, seeded RNG, turn clock, reducer
- `src/data/` — world data: issues, parties, backgrounds, New York regions and offices
- `src/sim/` — balance bot used by tests and `npm run sim`
- `src/storage/` — localStorage: the current run (`save.ts`) and the meta-progression profile (`profile.ts`)
- `src/ui/` — React app (start screen, character creator, header, map, Government / My profile / My party tabs)
