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

**Done when:** you can start a dummy run, press *End turn* repeatedly, reload the page
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

## M7 — Character v2: traits, skills, backgrounds

- Home state (any of 50) and resident state/region (playable); native vs transplant rules
  (hometown bonus vs newcomer penalty plus outside donors).
- 7 skills: CHA, COM, FUN, POL, ADM, LEA, LAW, remapped onto existing mechanics; POL ≥ 7 draws
  4 decision cards.
- 7 backgrounds with fixed and free points, state affinities, perks and weaknesses.
- Creator v2; save schema bump; bot and sim updated.

**Done when:** a native and a transplant start measurably differently (native ~10–12 points
likelier to win their first mayoral race, transplant ~20% more money), and each background's
perk shows up in the sim.

## M8 — People cards & the legislature

- People market (2–3 per turn), roster (max 6), signing fee plus salary, firing (card lost).
- Slots: campaign manager, chief of staff, party liaison, legislative director.
- Bill passage for Governor and federal offices: chamber control per cycle, LAW, director.
- ADM and LEA effects in office (wear, execution, crises).

**Done when:** a Rare cabinet is worth about +2 skill levels in the sim, and a Governor with
low LAW and no director sees noticeably more failed bills.

## M9 — Election night

- Engine: reporting timeline per region (poll closings, count progress, shrinking noise),
  call logic, win probability.
- Ground-game tokens earned in the campaign; actions on uncounted regions; capped swing.
- Animated screen: map fills, totals, needle, called banners, final call.

**Done when:** election nights for a mayoral and a statewide race play out live in about
1–2 min, and the bot shows the actions flip about 20–30% of close races and almost no
blowouts.

## M10 — Scenarios, meta-progression & run results

- Scenario framework: data definitions, objectives, cycle limits, stars, rewards.
- 4 beginner scenarios (Hometown favorite → Big city, small town); Sandbox unlocks on
  completion.
- Artifacts and loadout slots; profile store separate from run saves.
- Run results screen: stats charts, election history maps, legacy score; Hall of Runs (the
  old M7).
- CI: the bot plays each scenario and asserts its difficulty band.

**Done when:** a new player can clear the beginner track, earn artifacts, unlock Sandbox and
compare runs.

## M11 — Mobile-first UX & juice

- Portrait phone layout: bottom hand with drag-to-region, swipe decision stack, slim top bar.
- Landscape tablet layout.
- Animations (Framer Motion), haptics hooks; installable offline PWA.

**Done when:** a full scenario plays comfortably one-handed on a phone and the app installs
offline.

## M12 — California & advanced scenarios

- California (Los Angeles, Bay Area, Central Valley) with offices and chapter platforms.
- Advanced scenarios: The Underdog Superstar, Blue in a red district, The Carpetbagger,
  Machine politics, The Comeback.
- Balance pass on every scenario band.

**Done when:** all advanced scenarios sit inside their difficulty bands in CI.

---

## After v2 (expansion)

1. **More states:** up to 15 states / 25 regions, plus a US map.
2. **The presidency:** national primaries and the general election over the playable states,
   where the transplant's two-state payoff kicks in.
3. **Living world:** scandals, random events, recurring rivals, staff poached by opponents.
4. **Store release:** Capacitor builds, sound, onboarding polish.
