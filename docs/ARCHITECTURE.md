# Architecture

Political Chronicle is a static web app: React for the screens, and a pure TypeScript game
engine that knows nothing about React, the DOM or storage. Everything a player does is an
**action** applied to an immutable **GameState**.

```
 src/data ──► src/engine ──► src/ui
 (content)    (rules)         (screens)
                 ▲
     src/storage │ (localStorage: current run + profile, with save migrations)
     src/sim ────┘ (bots that play the engine, for tests and balance)
```

ESLint enforces the direction: `src/engine` and `src/data` may not import `src/ui` or React.

## Layers

| Folder         | What lives there                                                                                                                                                     | Rules                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/`    | Content as typed data: issues, parties, New York's regions and offices, backgrounds, event, decision, skill, people and item cards, scenarios, artifacts, abilities. | No logic beyond lookups (`getX(id)`). Adding content means adding data, not code.                                                                                         |
| `src/engine/`  | The rules. Each module owns one system (see below).                                                                                                                  | Pure functions only: same state + same action → same result. All randomness goes through the seeded `Rng` stored in `GameState.rng`. No `Date.now()`, no `Math.random()`. |
| `src/storage/` | `save.ts` (the current run), `profile.ts` (meta-progression), `migrations.ts` (upgrading old saves).                                                                 | Every access is wrapped: a blocked or full localStorage never crashes the game.                                                                                           |
| `src/sim/`     | `bot.ts`: scripted players (sensible, idle, contrarian, investor, flip-flop, climber) used by tests, `npm run sim` and the balance baseline.                         | Only uses the public engine API, like the UI does.                                                                                                                        |
| `src/ui/`      | React screens and panels. `App.tsx` routes between menu, scenarios, sandbox, game, results and the Hall of Runs.                                                     | Reads state and dispatches actions; never changes state directly.                                                                                                         |

## The action loop

```
UI ── dispatch(action) ──► applyAction(state, action)
                              1. validateAction  → GameError if illegal (message shown to the player)
                              2. reduce          → the next GameState
                              3. evaluateScenario → ends the run if a mission is won or lost
UI ◄──────── new state ─────── saved to localStorage after every action
```

- **`validate.ts`** is the single source of truth for "can I do this now?". The UI asks it the
  same question before enabling buttons (the `*Error` helpers it calls are exported too).
- **`errors.ts`**: `GameError` means "the rules say no"; any other exception is a bug, which the
  UI logs and reports as such.
- **`reducer.ts`** routes each action to its module and runs the end-of-turn sequence:
  opponents move → milestones pay out → snapshot → (Election Day → election night) → calendar,
  New Year (simulated races, ended terms), income, governing, new decisions.

## Engine modules

| Module                                   | System                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `types.ts`                               | Every state and data type.                                                   |
| `run.ts`                                 | Creating a run, artifacts, snapshots.                                        |
| `creation.ts`, `traits.ts`               | Character creation; home/resident state, backgrounds.                        |
| `time.ts`                                | The calendar: 3 turns a year, 4 in election years.                           |
| `opinion.ts`                             | Alignment, vote intention, polls, the partisan baseline.                     |
| `events.ts`                              | Event cards: preview and play.                                               |
| `decisions.ts`                           | The 3 (or 4) decision cards per turn; promises; party standing from votes.   |
| `economy.ts`                             | Income and prices.                                                           |
| `launch.ts`                              | Campaign windows, the race board, launching, self-funding, asking a party.   |
| `packs.ts`                               | Buying and opening packs; hands and discards.                                |
| `policy.ts`                              | Political events.                                                            |
| `world.ts`                               | Officeholders, simulated races, the calendar.                                |
| `stance.ts`                              | The 7-step platform scale.                                                   |
| `people.ts`                              | People cards, roles and role stars, perks.                                   |
| `campaign.ts`                            | Filing, opponents, nominations, primaries, drawing and finalizing elections. |
| `governing.ts`                           | Approval, wear, terms, re-election timing.                                   |
| `parties.ts`                             | Platforms, alignment, standing, party money, invitations.                    |
| `legislature.ts`                         | Chamber control and bill passage.                                            |
| `loot.ts`, `night.ts`                    | Campaign milestones and items; election night.                               |
| `scenarios.ts`, `meta.ts`                | Missions; the profile, rewards, unlocks, legacy score, run summaries.        |
| `validate.ts`, `errors.ts`, `reducer.ts` | The action pipeline above.                                                   |

## Saves and versions

`SCHEMA_VERSION` (in `run.ts`) is bumped whenever the shape of `GameState` changes. Each bump
needs a step in `src/storage/migrations.ts` that upgrades a save from the previous version, and
`migrations.test.ts` proves every step by turning a current game into the older shape,
upgrading it and playing on. Saves older than v6 (before the M7 skill system) are reported as
too old instead of silently dropped.

The meta-progression profile (stars, unlocks, artifacts, abilities, Hall of Runs) is stored
under its own key, so finishing or abandoning a run never touches it.
