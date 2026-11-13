# Political Chronicle

A card-driven political career simulator. Create a politician, run as an independent
for mayor, then climb through the House, Senate and Governor's office while balancing what
your voters want against what your party wants. Every career is recorded so runs can be
compared.

- [Game design](docs/DESIGN.md)
- [POC milestones](docs/MILESTONES.md)

Status: **M2 (character creation & profile) done** — creator (age, gender, birthplace,
8 backgrounds, skill points), clickable New York map with lean / recognition / favorability
layers and a region panel. Next: M3 (first campaign: running for mayor).

## Development

Requires Node 20+.

```bash
npm install
npm run dev        # local dev server
npm run check      # typecheck + tests + production build (what CI runs)
```

Layout:

- `src/engine/` — pure TypeScript game rules (no React): types, seeded RNG, turn clock, reducer
- `src/data/` — world data: issues, parties, backgrounds, New York regions and offices
- `src/storage/` — localStorage save/load
- `src/ui/` — React app (start screen, character creator, header, map, Government / My profile / My party tabs)
