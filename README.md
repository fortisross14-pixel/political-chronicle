# Political Chronicle

A card-driven political career simulator. Create a politician, run as an independent
for mayor, then climb through the House, Senate and Governor's office while balancing what
your voters want against what your party wants. Every career is recorded so runs can be
compared.

- [Game design](docs/DESIGN.md)
- [POC milestones](docs/MILESTONES.md)

Status: **M5 (governing) done** — win and you govern: 33 mayoral bills and executive actions,
job approval by region that wears down over time, promises judged against the platform you
won on, events in office, and an automatic re-election campaign where incumbents are judged
on approval. Next: M6 (parties & the climb to Governor).

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
