# Political Chronicle

A card-driven political career simulator. Create a politician, run as an independent
for mayor, then climb through the House, Senate and Governor's office while balancing what
your voters want against what your party wants. Every career is recorded so runs can be
compared.

- [Design v2 — the game we're building](docs/DESIGN_V2.md)
- [Design v1 — simulation engine](docs/DESIGN.md)
- [POC milestones](docs/MILESTONES.md)

Status: **M11 (development best practices) done** — ESLint + Prettier, a single action
validator with typed errors, save migrations (old saves upgrade instead of disappearing),
coverage floors, a performance budget, Playwright UI smoke tests, a fixed-seed balance
baseline and a bundle budget, all in CI on every push. **M12 (visual revamp) done**: the
Prime Time broadcast look, collectible 3D cards, drag-to-play and swipe decisions, sound and
vibration, and an installable offline app. **M13 (gameplay rework) done**: a blank start, launching campaigns, card packs, people with
role stars, political events, 7-step platforms and the World tab. Next: M14 balancing.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```bash
npm install
npm run dev        # local dev server
npm run check      # format, lint, types, tests + coverage, build, bundle budget, balance baseline
npm run e2e        # Playwright UI smoke tests (desktop + phone)
```
