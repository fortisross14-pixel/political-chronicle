# Political Chronicle

A card-driven political career simulator. Create a politician, run as an independent
for mayor, then climb through the House, Senate and Governor's office while balancing what
your voters want against what your party wants. Every career is recorded so runs can be
compared.

- [Design v2 — the game we're building](docs/DESIGN_V2.md)
- [Design v1 — simulation engine](docs/DESIGN.md)
- [POC milestones](docs/MILESTONES.md)

Status: **M8 (people cards & the legislature) done** — free people cards from drafts
(assign to campaign manager, chief of staff, party liaison or legislative director, keep in
reserve, or discard), skill boosts and perks while a role is active, and legislatures whose
control changes each cycle, so bills must pass. Next: M9 (campaign loot & election night).

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
- `src/storage/` — localStorage save/load
- `src/ui/` — React app (start screen, character creator, header, map, Government / My profile / My party tabs)
