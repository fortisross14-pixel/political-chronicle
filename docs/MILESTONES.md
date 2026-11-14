# POC Milestones

**POC goal:** a vertical slice in **New York (4 regions)** where one politician can go from
creating a profile → independent mayoral run → joining a party → House → Governor, with
stats recorded and runs comparable. See [DESIGN.md](./DESIGN.md) for the rules.

Each milestone ends with something playable or testable and a green build.

---

## M1 — Foundation & engine skeleton ✅ done

**Goal:** the empty game runs, advances turns, saves and loads.

- Vite + React + TypeScript scaffold, Vitest, lint, GitHub Pages deploy workflow.
- Folder layout: `src/engine`, `src/data`, `src/ui`.
- Core types: `GameState`, `Region`, `State`, `Issue`, `Party`, `Office`, `Card`, `Snapshot`.
- POC data: New York, its 4 regions (lean, issue opinion & salience, media mix), 16 issues,
  2 parties with national + NY chapter platforms, the office list.
- Engine: seeded RNG, `applyAction(state, action)` reducer, turn clock (3 turns per year, 4 in election years; date + aging),
  snapshot appended every turn.
- Autosave/load to localStorage; "New run / Continue" screen.
- App shell with the 3 tabs (Government, My profile, My party) as placeholders and a
  header (date, funds, energy).

**Done when:** you can start a dummy run, press _End turn_ repeatedly, reload the page
and continue; engine tests pass in CI.

---

## M2 — Character creation & profile ✅ done

**Goal:** create a politician whose choices matter mechanically.

- Creator flow: name, gender, age, birthplace (region), background, skill-point allocation.
- Backgrounds and age rules applied (starting funds, skill bias, energy, hometown bonus).
- Initial per-region recognition/favorability (hometown boost).
- **My profile** tab with sub-tabs: Overview, Skills, Ideals & record (empty Record),
  Election history (empty), Stats (placeholder).
- Read-only **Government** map: schematic SVG of NY with region panel (top issues, media
  mix, lean, your R/F).

**Done when:** two different characters (e.g. 28-year-old Watertown teacher vs. 55-year-old
NYC lawyer) start with visibly different skills, energy, funds and regional recognition.

---

## M3 — First campaign: running for mayor (first playable) ✅ done

**Goal:** a complete mayoral race as an independent, win or lose.

- Race picker (only mayoralties available at first) and **platform builder**: choose up to
  5 issues, each with a stance.
- Event cards: Basic cards + ~6 starter event cards in hand; play = region + topic, with
  effect preview; recognition/favorability resolution, spillover, fatigue, gaffes.
- Opinion model and **vote-intention map layer**; polls panel.
- AI opponent(s) with platform and simple strategy.
- Campaign-moment decision cards: 3 per turn, apply 1–3 (≈15 cards).
- Election day resolution with noise, results screen, `ElectionRecord` stored.
- After a loss: retry / choose another mayoralty / retire.

**Done when:** you can run for Mayor of Watertown or NYC, see the map shift as you play
events, and the election result follows the model. Unit tests cover the opinion and
election math.

---

## M4 — Economy, Market & skill growth ✅ done

**Goal:** money becomes the engine of choices.

- Funds income each turn (donors, salary) and fundraising event cards.
- **Card Market**: 6 rotating offers per turn, buy event cards & skill cards, hand limit.
- Full event card set from the design (TV, cable interview, social campaign, podcast,
  arena rally, debate, radio, town hall, fundraising dinner).
- Skill cards with level costs, caps per office, upkeep (digital director).
- Headless balance harness `npm run sim` reporting mayoral win rates by strategy.

**Done when:** a player who invests in Fundraising early can afford arena rallies later,
and the sim harness shows the mayoral win-rate target (~70% for a sensible bot in its
hometown) within ±10%.

---

## M5 — Governing: decision cards in office ✅ done

**Goal:** winning leads to a meaningful term, not a victory screen.

- Office state: term clock, approval per region (seeded from vote share).
- In-office decision card pool for Mayor (~30 bills/executive actions) with issue tags,
  reject costs and region effects; Policy skill controls preview precision.
- **Record** updates, **promise keeping** & **Integrity**, consistency → credibility.
- Event cards usable in office (maintain approval, build recognition beyond your region).
- Re-election flow in the election year (last 4 turns) of a term (or retire / run elsewhere).
- **Ideals & record** sub-tab: platform, Record across 16 issues, promises kept/broken log.

**Done when:** a mayor who keeps promises gets re-elected noticeably more often than one
who flip-flops (verified in the sim harness), and the record screen explains why.

---

## M6 — Parties & the climb to Governor ✅ done

**Goal:** the full vertical slice: Mayor → House → Governor in New York.

- Party invitations, joining/switching, national + state-chapter platform blend.
- Alignment and **Standing** mechanics, party-priority (whip) decision cards.
- Party funds per turn; Party unity event & mentorship cards.
- **My party** tab: platform comparison, standing, alignment, funds, nomination requests.
- Nomination thresholds and **primaries** (party electorate).
- House race in a region and **statewide races** (Senate, Governor) across all 4 regions,
  including spillover and multi-region strategy; House/Senate/Governor decision card pools.
- Partisan opponents scaled by office.

**Done when:** a Watertown-born politician can join a party, win the North Country House
seat, request the gubernatorial nomination and win (or lose) Governor by having to
compete in NYC. The red-region/blue-state tension is visible in the Party tab.

---

## Roadmap v2 (from here)

The direction changed after M6: a card roguelike for phones and tablets, with scenarios and
sandbox, people cards, a legislature and an animated election night. See
[DESIGN_V2.md](./DESIGN_V2.md). The old M7 (stats and Hall of Runs) folds into M10.

## M7 — Character v2: traits, skills, backgrounds ✅ done

- Home state (any of 50) and resident state/region (playable); native vs transplant rules
  (hometown bonus vs newcomer penalty plus outside donors).
- 7 skills: CHA, ECO, DIP, STR, ADM, LEA, LAW, remapped onto existing mechanics (CHA drives
  events and gaffes, ECO donors, STR previews; STR ≥ 7 draws 4 decision cards).
- 7 backgrounds with fixed and free points, state affinities, perks and weaknesses.
- Creator v2; save schema bump; bot and sim updated.

**Done when:** a native and a transplant start measurably differently (native ~10–12 points
likelier to win their first mayoral race, transplant ~20% more money), and each background's
perk shows up in the sim.

## M8 — People cards & the legislature ✅ done

- People cards bought once in the Market (one person offer per turn, priced by rarity, no
  salary); assign, keep in reserve, or discard (permanent); roster max 6.
- Slots: campaign manager, chief of staff, party liaison, legislative director.
- Bill passage for Governor and federal offices: chamber control per cycle, LAW, DIP, director.
- ADM, ECO and LEA effects in office (wear, execution, budget cards and the Governor's budget
  meter, crises).

**Done when:** a Rare cabinet is worth about +2 skill levels in the sim, and a Governor with
low LAW and no director sees noticeably more failed bills.

## M9 — Campaign loot & election night ✅ done

- Engine: reporting timeline per region (poll closings, count progress, shrinking noise),
  call logic, win probability.
- Campaign loot: items, money and cards from campaign milestones; items with use windows
  (campaign / night / both).
- Ground-game tokens and night items; actions on uncounted regions; capped swing.
- Animated screen: map fills, totals, needle, called banners, final call.

**Done when:** election nights for a mayoral and a statewide race play out live in about
1–2 min, and the bot shows the actions flip about 20–30% of close races and almost no
blowouts.

## M10 — Scenarios, meta-progression & run results ✅ done

- Scenario framework: data definitions, objectives, cycle limits, stars, rewards.
- 4 beginner scenarios (Hometown favorite → Big city, small town); Sandbox unlocks on
  completion.
- Artifacts and loadout slots; **abilities** earned from missions (2 slots in Sandbox); profile
  store separate from run saves.
- Run results screen: stats charts, election history maps, legacy score; Hall of Runs (the
  old M7).
- CI: the bot plays each scenario and asserts its difficulty band.

**Done when:** a new player can clear the beginner track, earn artifacts, unlock Sandbox and
compare runs.

## M11 — Development best practices ✅ done

- Code health pass: module boundaries (engine / data / ui), naming, dead code, comments where
  the "why" isn't obvious.
- Engine invariants: action validation in one place, typed errors, schema migrations instead
  of discarding old saves.
- Testing: coverage of every action and edge case, UI smoke tests in CI (Playwright), the
  balance sim as a CI job with stored baselines.
- Tooling: ESLint + Prettier, strict CI (typecheck, lint, test, build, sim), bundle size check,
  performance budget for a turn on a mid-range phone.
- Docs: architecture overview and contributor guide.

**Done when:** CI runs lint, type checks, unit tests, UI smoke tests and the balance-sim
baseline on every push, and old saves migrate instead of being dropped.

## M12 — Total visual revamp

- A new visual identity: typography, color system, iconography and card art direction (cards
  that feel like cards).
- **Mobile-first layout:** portrait phone with the bottom hand and drag-to-region, a swipe
  stack for decisions and a slim top bar; a landscape tablet layout.
- Juice everywhere: card flips and draws, count-ups, map fills, an election night with TV-style
  graphics, haptics and sound hooks.
- Installable offline web app (PWA); accessibility pass (contrast, focus, reduced motion).

**Done when:** a full scenario plays comfortably one-handed on a phone, looks like a premium
game, and installs offline.

**Status: done.** The "Prime Time" direction (network-studio look) was chosen from three
mock-ups. Built:

- The broadcast skin (`src/ui/primetime.css`; Barlow, Barlow Condensed and Alfa Slab One,
  self-hosted) and collectible cards with 3D tilt, glare, foil and art drawn in code
  (`src/ui/cards`), including a card for your politician on the profile.
- A thumb-reach dock (tabs and End turn), Government split into Desk, Map, Play cards, Market and
  Team with badges, a turn wipe and a "latest" lower third, a compact phone header.
- Drag a card onto a map region or region chip to play it; on phones, decisions are a swipe
  stack (right to sign or back, left to pass) with buttons for the same.
- Count-ups on funds, energy, integrity, approval and night results; synthesised sound effects
  and vibration (both switchable in the game menu, `src/ui/fx`).
- The TV map coloured by who leads; a broadcast election night (scoreboard, projection banner,
  results crawl).
- An installable offline web app: manifest, icons (`npm run icons` re-renders them from
  `public/icon.svg`) and a service worker that precaches every build file.
- Tablet and phone layouts; tables that stack on phones.
- Accessibility: WCAG 2.1 AA checks (axe) on every main screen at desktop and phone size in CI,
  reduced motion respected, every drag and swipe has a button alternative.

## M13 — Gameplay rework

**Status: done.** See DESIGN_V2 §11 for the rules as built.

- Start blank: no race, only personal wealth (by background: organizers thousands, executives
  millions, a few billionaires) and a free pack of three people.
- Launch a campaign from the race board (every office in the state, statewide races locked
  until you've held office or are known statewide, President locked) inside its window: 7 to
  4 turns before Election Day. The launch screen: campaign chief, self-donation (voters grumble
  past a normal amount), up to 5 topics on 7-step sliders with voter and party marks, and asking
  a party to take you. Launching deals two free packs (keep one card each).
- Packs replace the Market: people, political events and campaign actions, each regular,
  golden or elite. People have 0–5 stars in each of four roles; anyone can fill any role.
  Roster of 10, political events hand of 5, campaign actions hand of 8.
- Platforms carry over: each campaign may drop one topic, add up to five, and move one by a step.
- Public stances while campaigning; bills in office hit approval much harder, with a signing
  ceremony. Re-election is launched like any race; a term you don't defend ends.
- The World tab: who holds every office, the election calendar, every result (yours and the
  races you sat out, simulated each New Year).

**Done when:** a new run starts blank and the whole loop (launch → campaign → govern → next
race) plays through these systems, with saves migrated (v9 → v10).

## M14 — Balancing

**Status: done.** See DESIGN_V2 §12 for the measured results.

- A balance pass on everything with the bot harness: every scenario inside its difficulty
  band (Hometown favorite is too easy and Big city, small town too hard after M13);
  backgrounds within ±8 points of each other per state; native vs transplant gap 10–12;
  people, packs and night actions inside their targets; self-funding without runaways.
- Tune pack prices and odds, role-star effects and the campaign window edge.
- Difficulty settings for Sandbox (Easy / Normal / Hard).

**Done when:** every target in DESIGN_V2 is met by the sim in CI.

---

## M15 — Missions, trinkets and election day ✅ done

- **Five rarities** (common, uncommon, rare, epic, legendary); collectible cards are framed by
  rarity only (grey, green, blue, purple, gold). Pack odds per tier: regular 60/28/10/2/0,
  golden 15/30/33/17/5, elite 0/10/35/37/18. A new legendary campaign action: National TV interview.
- **Effect chips** on every card (reach and persuasion pips, where the medium lands best,
  statewide, topics, money, gaffe risk; approval, favorability and funds on political events).
  The hand still shows the exact per-region preview before you play.
- **Skill cards** in packs: 30/40/50% of regular/golden/elite packs swap one card for +1 to a
  skill under your cap. Free, on top of what you keep. Training political events are gone.
- **The field:** mayoral races outside the big city draw 1–2 challengers (2–3 candidates).
  The launch screen lists who you'd face, incumbent or not, and their lean (red, blue, neutral),
  from a per-race seed so the preview is the race you file.
- **Trinkets** replace artifacts and abilities: 16 in five rarities, six commons owned from the
  start, the rest earned with mission stars. 2 slots (+1 at 6 and 10 stars). Windows: campaign,
  Election Day (mobilize), election night after the exit polls (late voters), governing, passive.
  Force the vote passes your next bill without the votes in the chamber.
- **Mission setup:** the full dossier (background, age, birthplace and residence, native or
  transplant, money, party, office), 5 extra skill points (start cap 7), trinkets, and retries.
- **Election day:** End turn reads “Start election day” on the election turn; mobilize first.
  The night opens on the exit polls (±1.2 points), late-voter cards and trinkets, then the count.
- **Re-election is judged on the record:** approval weight 2 → 3; campaign events count ×0.6
  when you defend your own seat.
- **Advanced missions** (after the beginner track): The underdog, Blue in the North Country,
  Small town to the top.
- Save schema v11 (training cards dropped, abilities become equipped trinkets).

**Measured (bot, 30–40 runs):** beginner missions on a first try (no points, no trinkets) 70–95%;
prepared (5 points on charisma/strategy, mobilize + surprise appearance) 93–100%. Advanced, first
try / prepared: underdog 7% / 53%, Blue in the North 17% / 40%, small town to the top 33% / 73%.

---

## M16 — Electorate, maps and art pipeline ✅ done

- **Demographics drive everything local.** Every district and neighborhood is a mix of three age
  groups (young, adult, senior), three classes (low, middle, high) and three education levels (no
  degree, some college, college). The mix sets each topic's average opinion and salience, the
  media mix and, with the place's history, its lean (`engine/demographics.ts`).
- **New York re-cut into 18 districts** (five boroughs, Long Island, Westchester, Hudson Valley,
  Capital Region, Catskills, Mohawk Valley, North Country, Central NY, Finger Lakes, Rochester,
  Buffalo, Southern Tier, Chautauqua). Six House seats, each across several districts.
- **City neighborhoods** for the mayoral races: Watertown 7, Buffalo 9, NYC 12. They roll up into
  their district (weighted by the city's reach) and district changes flow down (`engine/levels.ts`).
- **Cards have audiences.** Each medium reaches some groups better (TV seniors, social young
  adults, radio no-degree voters…) and many cards add their own (union rally, rotary lunch,
  college tour, podcast). Card faces say who they reach best and worst; the hand preview still
  gives exact numbers per area.
- **Media carry across a race:** in a city TV reaches every neighborhood (85%), door-knocking stays
  mostly on the block (35%); across districts, TV and cable carry 45% to the race's other districts.
  Opponents' events spread the same way.
- **Maps:** generated geometry (`scripts/maps.ts` → `data/geometry.ts`) for the state (with an
  NYC inset) and each city. The map shows the city when the race or office is a mayoralty.
  Layers: Leading (grey where undecided is the biggest bloc), **Shift this turn**, approval,
  lean, recognition, favorability. Tap an area: “Mill Street: Brennan 51.8 (+2.7) · You 21.2 (−1.2) ·
  Undecided 27.0 (−1.5)”.
- **Election night** reveals areas one by one (rural and suburban first, big-city boxes last), with
  a per-area cap on night boosts.
- **Art pipeline:** `art/grids.json` → `art/PROMPTS.md` (five 6 × 4 grids: actions, events and items,
  trinkets and backgrounds, two of portraits incl. opponents and player faces); `npm run art`
  slices `art/grids/<id>.png` into `public/art/` and cards use the painted image when it exists.
- Fixed: governing decisions never reached a mayor's jurisdiction once it was neighborhoods.
- Save schema v12 (region-keyed records rebuilt from the old four regions).

**Measured (bot):** hometown mayor 78% (Watertown), 68% (Buffalo), 45% (NYC); transplant 68%;
keeper re-elected 97%, flip-flopper 0%; Governor reached 85% (first try 30%). Missions first try /
prepared: Hometown 80 / 100, Keep your word 70 / 90, Pick a side 60 / 85 (now a four-district
seat: win Syracuse), Big city 80 / 100.

---

## After v2 (expansion)

1. **More states:** California, Texas and smaller states (4–6 districts for Iowa-sized states),
   growing to about 10 playable states, plus a 50-state US map for the presidency.
2. **More advanced missions:** The impossible law (a law-passing objective), The Carpetbagger,
   Machine politics, The Comeback; a town council for mayors so Force the vote matters there too.
3. **The presidency:** national primaries and the general election over the playable states,
   where the transplant's two-state payoff kicks in.
4. **Living world:** scandals, random events, recurring rivals, staff poached by opponents.
5. **Store release:** Capacitor builds, sound, onboarding polish.
