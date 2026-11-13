# Political Chronicle — Game Design (v1 draft)

> A card-driven career simulator. You create a politician, start as an independent
> running for mayor, and climb (or crash) your way through the House, Senate and
> Governor's mansion — balancing what your voters want against what your party wants.
> Every run is recorded so you can compare careers.

---

## 1. Pillars

1. **The balancing act.** Voters reward you for doing what you promised and for
   positions that fit *their* region. Your party rewards you for sticking to *its*
   platform. In a red state as a Democrat (or a blue city as a Republican) those
   pull in different directions. That tension is the game.
2. **Where × What × How.** Every campaign action is a choice of *location*, *issue*
   (one of your 5 platform topics) and *medium* (TV, social, arena rally...). The same
   message can win one region and lose another.
3. **Money buys options.** Funds buy event cards (to campaign) and skill cards (to grow
   your politician). Fundraising is a resource loop, not a side activity.
4. **Short turns, long careers.** One quarter = one turn. A turn should take 1–3 minutes.
   A full career is 40–120 turns.
5. **Every run is data.** All stats are snapshotted every quarter; finished careers go to
   the Hall of Runs for comparison.

---

## 2. Core loop

```
Create politician ─► Pick a race ─► Choose up to 5 platform topics (with stance)
        ▲                                  │
        │                                  ▼
        │                  ┌──────── QUARTER TURN ────────┐
        │                  │ 1. Income (donors, party, salary)
        │                  │ 2. Draw 3 decision cards → apply 1–3, reject rest
        │                  │ 3. Spend Energy + Funds: play event cards
        │                  │    (location + platform topic)
        │                  │ 4. Buy cards in the Market (events / skills)
        │                  │ 5. Opponents act, polls update, end quarter
        │                  └──────────────────────────────┘
        │                                  │
        │                           Election day
        │                    ┌─────────────┴─────────────┐
        │                  LOSE                         WIN
        │        retry same race / pick another     GOVERN (decision cards
        └────────── race / retire                   become bills & executive
                                                    actions) → re-elect or
                                                    request a higher nomination
```

The same quarter structure is used while **campaigning** and while **governing**; only
the flavour of the decision cards and what gets scored changes.

---

## 3. The politician

### 3.1 Creation

| Field | Options | Mechanical effect |
|---|---|---|
| Name | free text | — |
| Gender | female / male / non-binary | Pronouns and portrait only. **No mechanical effect** (avoids stereotyped modifiers). |
| Age | 25–65 | Younger: more Energy, fewer starting skill points, longer career. Older: fewer Energy, more skill points (experience). |
| Place of birth | any region in the game | **Hometown bonus**: +25% recognition and +10 favorability there, permanently decaying slowly. |
| Background | Lawyer, Teacher, Small-business owner, Veteran, Doctor, Union organizer, Activist, Tech founder | Starting skill bias, starting funds, and +/- affinity with a couple of issues (e.g. Union organizer is credible on Labor). |
| Starting ideology (optional) | sliders on a few issues | Pre-fills your Record so you don't start blank. |

Starting skill points: `10 + floor((age − 25) / 5)` distributed by the player on top of
background bonuses, max 5 in any skill at creation.

### 3.2 Skills (7)

Each skill runs **1–10**. Skill multiplier used everywhere: `skillMult = 0.6 + 0.08 × skill`
(skill 1 → 0.68, skill 5 → 1.0, skill 10 → 1.4).

| Skill | Drives |
|---|---|
| **Oratory** | Arena rallies, speeches, convention addresses, debate delivery |
| **Charisma** | Retail politics: town halls, door-knocking, diners; slows favorability loss |
| **Media Savvy** | TV & cable interviews, press conferences; lowers gaffe chance |
| **Digital** | Social-media campaigns, podcasts, viral reach & spillover |
| **Policy** (intelligence) | Debates, credibility (persuasion multiplier), previews the regional effect of decision cards before you apply them |
| **Negotiation** | Party standing gains, endorsements, legislative deal cards |
| **Fundraising** | Donor income per quarter, fundraising events |

Derived (not trained directly):

- **Energy** – action points per quarter. `Energy = 6 at age ≤ 40`, −1 per 10 years after.
  Event cards cost 1–3 Energy.
- **Integrity** – 0–100 reputation for keeping promises (see §6.3).
- **Recognition / Favorability** – per region (see §5).

### 3.3 Aging & career end

Age advances 0.25 per quarter. A run ends when you **retire**, **lose three elections in a
row** while out of office, or reach age 85. (Post-POC: also when you become President.)

---

## 4. The world

### 4.1 Regions, not counties

We model the US as **regions**: a seat city plus its surrounding area. Each region:

```ts
interface Region {
  id: string;               // "ny-nyc"
  state: string;            // "NY"
  name: string;             // "New York City"
  seatCity: string;
  type: "urban" | "suburban" | "midsize" | "rural";
  population: number;       // used to weight statewide races
  turnout: number;          // 0..1
  partisanLean: number;     // -1 (strong D) .. +1 (strong R)
  issueOpinion: Record<IssueId, number>;   // -2..+2 average stance
  issueSalience: Record<IssueId, number>;  // 0..1 how much they care
  media: { tv; cable; social; inPerson; radio }; // 0.5..1.5 effectiveness
  mayorOffice?: OfficeId;   // only some regions have a playable mayoralty
  houseSeat: OfficeId;      // abstracted: one House seat per region
}
```

Regions inside a state **cover the whole state population**, so statewide races
(Senate, Governor) are a population × turnout weighted sum over the state's regions.

> House seats are an abstraction: one seat per region (not the real district map). This
> keeps the "small town vs big city" fantasy while staying tractable.

### 4.2 POC map — New York (4 regions)

| Region | Seat | Type | Pop share | Lean | Mayor office | Flavour |
|---|---|---|---|---|---|---|
| New York City | NYC | urban | 43% | −0.60 | ✅ Mayor of NYC | Transit, housing, policing, LGBTQ rights, social & cable heavy |
| Suburbs (Long Island & Hudson Valley) | White Plains | suburban | 25% | −0.10 | — | Property taxes, schools, crime; TV heavy, swing region |
| Western NY | Buffalo | midsize | 15% | +0.05 | ✅ Mayor of Buffalo | Industry, unions, jobs; local TV & radio |
| North Country & Southern Tier | Watertown | rural | 17% | +0.40 | ✅ Mayor of Watertown | Guns, farming, energy, military (Fort Drum); radio & in-person |

Offices in the POC: 3 mayors, 4 House seats, 1 Senate seat (races every 2 years, abstracting
the two staggered seats), 1 Governor.

The intended POC journey: born in Watertown → win Watertown mayor easily → join a party
→ House seat for North Country → Governor, where you suddenly need NYC.

### 4.3 Full game — 15 states, 25 regions (expansion target)

| State | Regions |
|---|---|
| New York | NYC, Suburbs, Western NY (Buffalo), North Country (Watertown) |
| California | Los Angeles, Central Valley (Fresno), Bay Area (San Francisco) |
| Texas | Houston, Austin, West Texas (Lubbock) |
| Illinois | Chicago, Downstate (Peoria) |
| Florida | Miami-Dade, I-4 Corridor (Orlando) |
| Pennsylvania | Philadelphia, Pittsburgh & West |
| Ohio | Columbus, Mahoning Valley (Youngstown) |
| Georgia | Atlanta, South Georgia (Macon) |
| Michigan | Detroit & suburbs |
| Wisconsin | Milwaukee |
| Arizona | Phoenix |
| Colorado | Denver |
| Massachusetts | Boston |
| North Carolina | Charlotte |
| Wyoming | Cheyenne (at-large) |

Single-region states make House and statewide races overlap (true for Wyoming). For the
presidency (post-POC), these 15 states carry scaled electoral votes and stand in for the
nation.

### 4.4 Issues (16)

Each issue is an axis from **−2 to +2**. Negative is roughly "progressive", positive
"conservative", but labels are shown per pole, never as left/right.

| Id | −2 pole | +2 pole | Mayor-relevant? |
|---|---|---|---|
| taxes | Raise taxes on high earners | Cut taxes broadly | ✅ (local taxes) |
| min_wage | Raise minimum wage | Leave to the market | ✅ |
| healthcare | Public option / single payer | Private market | — |
| guns | Stricter gun control | Protect gun rights | partial |
| abortion | Protect abortion access | Restrict abortion | — |
| lgbtq | Expand LGBTQ protections | Limit / roll back | partial |
| immigration | Path to citizenship | Enforcement first | partial |
| climate | Green transition | Expand fossil energy | partial |
| industry | Industrial policy & subsidies | Deregulate & let markets pick | ✅ |
| policing | Reform & reinvest | Fund & expand police | ✅ |
| education | Fund public schools | School choice / vouchers | ✅ |
| housing | Build more & rent protections | Local control / single-family | ✅ |
| transit | Invest in transit | Prioritise roads & cars | ✅ |
| labor | Strengthen unions | Right-to-work | partial |
| cannabis | Legalise | Keep prohibited | partial |
| small_biz | Regulate business | Cut red tape | ✅ |

**Jurisdiction relevance** multiplies the effect of an issue by office:
✅ = 1.0, partial = 0.6, — = 0.3 at mayor level; every issue is 1.0 at House/Senate/Governor.
(Campaigning for mayor on abortion is allowed — it just does little.)

---

## 5. Public opinion model

Per region, per candidate:

- **Recognition `R` ∈ [0,1]** – share of voters who know who you are.
- **Favorability `F` ∈ [−1,1]** – net opinion among those who know you.

Mayor races start with you at `R ≈ 0.05` (0.30 in your hometown).

### 5.1 Issue alignment

For a stance `x` on issue `i` in region `r` with average opinion `o`:

```
alignment(x, r, i) = 1 − |x − o| / 2          // range −1 .. +1
```

A +2 stance in a region averaging −2 has alignment −1: talking about it there *hurts*.

### 5.2 Vote intention

```
U(candidate, r) = 1.6·F·R            // being known & liked
                + 0.6·R              // familiarity / viability
                + 1.2·partyFit       // D: −lean, R: +lean, Independent: 0
                + 0.3·incumbent
                − indepPenalty(office)  // 0 mayor, 0.3 House, 0.5 statewide

share(c, r) = softmax over candidates of U / τ  (τ ≈ 0.5), with an "undecided" option
```

Statewide result = Σ_r population × turnout × share. On election day add polling noise
(σ ≈ 2.5 pts per region, partially correlated statewide). The **Government map** shows
vote intention per region as a diverging colour (you vs. the leading opponent).

### 5.3 Opponents

Each race spawns 1–2 AI candidates with a party, 5 platform topics, recognition,
favorability, funds and a simple strategy (play their strongest issue in their best
region each quarter). Opponent quality scales with office level. Incumbents start with
high recognition.

---

## 6. Cards

Three card families. Every card is data (JSON/TS), no bespoke code per card.

### 6.1 Event cards (campaigning & outreach)

Played from your hand: **pick a region** (in the race's jurisdiction — later anywhere) and
**one of your 5 platform topics**. Consumable unless marked *Basic*.

| Card | Cost | Energy | Medium | Skill | Reach | Persuasion | Spillover |
|---|---|---|---|---|---|---|---|
| Door-knocking *(Basic)* | $0 | 2 | inPerson | Charisma | 0.04 | 0.06 | none |
| Free social post *(Basic)* | $0 | 1 | social | Digital | 0.03 | 0.02 | 20% state |
| Town hall | $5k | 2 | inPerson | Charisma | 0.06 | 0.10 | none |
| Local radio interview | $8k | 1 | radio | Media | 0.08 | 0.05 | none |
| Local TV ad buy | $40k | 1 | tv | Media | 0.15 | 0.06 | 15% state |
| CNN-style cable interview | $25k | 1 | cable | Media | 0.12 | 0.08 | 50% state, 10% national |
| Social media campaign | $30k | 1 | social | Digital | 0.14 | 0.05 | 40% state |
| Podcast tour | $15k | 2 | social | Digital | 0.08 | 0.09 | 30% state |
| Arena rally | $120k | 3 | inPerson | Oratory | 0.20 | 0.14 | 20% state |
| Televised debate | $0 (drawn, not bought) | 2 | tv | Policy + Oratory | 0.18 | ±0.15 | 60% state |
| Fundraising dinner | $10k | 2 | inPerson | Fundraising | 0.02 | 0 | → +$ (Fundraising × recognition) |
| Party unity event | $20k | 2 | inPerson | Negotiation | 0.05 | 0.03 | → +Party standing |

**Resolution** for the target region `r`, topic `i`, your stance `x`:

```
m      = media[r][card.medium] × skillMult × fatigue × hometownBonus
ΔR     = card.reach × m × (1 − R)
ΔF     = card.persuasion × m × salience[r][i] × alignment(x, r, i)
         × relevance(i, office) × credibility
F      = clamp(F + ΔF × (1 − |F|), −1, 1)
```

- **Spillover** applies the same formula at the stated percentage to the other regions of
  the state — **using each region's own alignment**. Your loud NYC message on LGBTQ
  rights is also heard in Watertown.
- **Fatigue**: same topic in the same region again within 2 quarters → ×0.7 per repeat.
- **Credibility** = `0.7 + 0.03 × Policy + 0.3 × consistency`, where consistency is how well
  this stance matches your Record (flip-flopping is less persuasive).
- **Gaffe**: small chance on TV/cable/debate (`8% − 0.6% × Media Savvy`) of a negative swing.

The UI previews the *expected* effect in each region before you confirm (coarse for low
Policy skill, precise for high).

### 6.2 Skill cards (profile growth)

Bought in the Market, applied immediately, permanent.

| Card | Effect | Cost |
|---|---|---|
| Speech coach | +1 Oratory | $15k × current level |
| Improv & retail-politics workshop | +1 Charisma | $15k × level |
| Media training | +1 Media Savvy | $15k × level |
| Hire a digital director | +1 Digital, $5k/quarter upkeep | $20k × level |
| Think-tank fellowship | +1 Policy, costs 2 Energy this quarter | $10k × level |
| Mentorship with a party elder | +1 Negotiation, +5 party standing | requires party member |
| Donor network gala | +1 Fundraising | $25k × level |

Skill cards have a level cap per office (mayor ≤ 6, House ≤ 8, statewide ≤ 10) so growth
is paced by career progress.

### 6.3 Decision cards (the quarterly 3)

Every quarter you are dealt **3 decision cards**. You must **apply at least 1 and up to 3**;
the rest are rejected. You cannot pass.

- **While campaigning** they are *campaign moments*: interest-group questionnaires,
  endorsement offers, debate questions, local controversies ("Do you support the
  stadium tax break?").
- **While in office** they are *bills and executive actions*, filtered by office level
  (zoning reform as mayor, a federal farm bill in the House, a state budget as Governor).

```ts
interface DecisionCard {
  id: string;
  title: string;
  offices: OfficeLevel[];           // where it can be drawn
  tags: { issue: IssueId; stance: number }[];  // what applying it means
  partyPriority?: "D" | "R";        // marked as a whip vote for that party
  rejectCost?: number;              // some cards hurt to reject (crisis response)
  effects?: { funds?: number; integrity?: number; regions?: Partial<Record<RegionId, number>> };
}
```

**Applying** a card:

1. Moves your **Record** on each tagged issue toward the card's stance.
2. Changes **approval / favorability** in every region of your jurisdiction by
   `Σ_tags salience × alignment × weight`.
3. **Promise keeping**: if a tag matches one of your 5 platform topics in the same
   direction → bonus among regions that voted for you and **Integrity +**. If it
   contradicts a platform topic → penalty and **Integrity −** (larger than the bonus).
4. **Party**: agreement with the party platform raises Party standing; disagreement on a
   `partyPriority` card lowers it sharply.

**Rejecting** is neutral except for `rejectCost` cards. Choosing *which* card to apply is
the puzzle: 3 bad options means picking the least bad one.

---

## 7. Offices & elections

| Office | Jurisdiction | Term | Campaign length | Partisan? | How to get on the ballot |
|---|---|---|---|---|---|
| Mayor | 1 region | 16 quarters | 4 quarters | No (independent OK) | Open — just file |
| U.S. House | 1 region | 8 quarters | 4 quarters | Yes | Party nomination (standing ≥ 40) or primary |
| U.S. Senate | state | 24 quarters | 6 quarters | Yes | Party nomination (standing ≥ 60) or primary |
| Governor | state | 16 quarters | 6 quarters | Yes | Party nomination (standing ≥ 60) or primary |
| *President (post-POC)* | nation | 16 quarters | 8 quarters | Yes | Presidential primaries (standing ≥ 75 + national recognition) |

- **Losing** returns you to the race picker: retry the same race next cycle, pick another
  race you're eligible for, or retire.
- **Winning** starts the term. In the final `campaign length` quarters of a term you are
  in re-election mode (event cards target the election again) unless you have requested
  a different office.
- **Moving between offices**: once in office you can, from the Party tab, request a
  nomination for any House/Senate/Governor race in your state that comes up. Leaving
  mid-term to run is allowed (you give up the seat if you lose).
- **Primaries**: if your standing is below the nomination threshold but above
  `threshold − 25`, you can force a primary. A primary uses the same opinion model but
  the electorate is that party's voters (regions' issue opinions shifted toward the
  party platform), so alignment with the party matters far more than in the general.

---

## 8. Parties

Two parties in the POC: **Democratic (D)** and **Republican (R)**, with stylised
platforms (a −2..+2 position and a priority weight on each issue). Independent is a
valid affiliation but gets no party funds and pays the `indepPenalty` above mayor.

### 8.1 Joining

You start independent. After winning your first office (or after any lost race) both
parties may invite you; the invitation strength depends on your current alignment. Switching
parties later is possible but costs a large Integrity and standing hit.

### 8.2 Alignment

```
platform_eff = 0.7 × nationalPlatform + 0.3 × stateChapterPlatform   // NY Dems ≠ TX Dems
alignment    = 1 − Σ_i w_i·|record_i − platform_eff_i| / (4 Σ_i w_i)   // 0..1, issues in your Record only
```

The state chapter blend is what makes "Democrat in a red state" playable: the local party
tolerates more deviation than the national one.

### 8.3 Standing (relationship)

`Standing` 0–100. Gains: applying platform-aligned decision cards (+), party-priority votes
with the party (++), Party unity events, mentorship cards, winning races, raising money
for others. Losses: voting against party priorities (−−), publicly attacking the party
platform in events, losing winnable races.

### 8.4 Party funds

Paid every quarter to members:

```
partyFunds = officeBase × (standing / 100) × alignment² × competitiveness(race)
```

Competitive races get more money; safe seats and hopeless races get less.

### 8.5 The Party tab

- Side-by-side: your Record vs. party platform, issue by issue (with the state chapter
  shown).
- Standing, alignment, last quarters' party funds.
- **Request nomination**: lists upcoming races in your state with requirements and your
  odds (grant / primary / denied).

---

## 9. Economy

| Source | Formula (per quarter) |
|---|---|
| Donors | `2k + 3k × Fundraising × Σ_r (R_r × pop_r) / statePop` (scaled ×3 statewide) |
| Party | see §8.4 |
| Fundraising dinner card | `Fundraising × 8k × R_region` |
| Salary | small, flavour |

Spending: event cards, skill cards, staff upkeep. Funds carry over between races; a
losing campaign that overspent leaves you broke for the next one.

Card Market: each quarter shows **6 offers** (rotating) drawn from the event and skill
pools, filtered by office level, plus the always-available Basic cards. Hand limit 8.

---

## 10. Screens

Top-level tabs (plus a header with date, office, funds, energy, integrity):

### 10.1 Government
- **Map** of the state (POC: schematic SVG of New York's 4 regions). Toggle layers: vote
  intention, recognition, favorability, approval, partisan lean, issue salience for a
  selected topic.
- **Region panel**: demographics flavour, top 3 issues, media mix, your R/F there.
- **Decision tray**: this quarter's 3 decision cards with apply / reject, and the
  "apply at least 1" rule enforced.
- **Hand & Market**: event cards (drag onto a region → pick topic → confirm) and the
  Market.
- **End quarter** button.

### 10.2 My profile (sub-tabs)
- **Overview** – portrait, age, background, current office, key numbers.
- **Skills** – 7 skills with level, cap, and history.
- **Ideals & record** – your current 5 platform topics, full Record across 16 issues,
  promises kept/broken log.
- **Election history** – every race: office, opponents, result, map snapshot.
- **Stats** – charts over time (funds, recognition, approval, standing, alignment, skills).

### 10.3 My party
- Platform comparison, standing, alignment, funds history, nomination requests (§8.5).

### Outside a run
- **New run** (character creator), **Continue**, **Hall of Runs** (compare finished
  careers: highest office, years served, elections W/L, funds raised, promises kept %,
  legacy score; charts overlaid).

---

## 11. Statistics & runs

- Every quarter the engine appends a `Snapshot` (date, office, funds, energy, integrity,
  skills, party standing & alignment, per-region R/F/approval, vote intention if
  campaigning).
- Every election appends an `ElectionRecord` (office, candidates, per-region results).
- A finished run becomes a `RunSummary` (+ compressed snapshots) in the Hall of Runs.

**Legacy score** (for comparison): office points (Mayor 10, House 20, Senate 35,
Governor 40, President 100) × years served, + promises kept %, + peak approval, − scandals.

---

## 12. Technical approach

- **Stack**: React + Vite + TypeScript, static site deployed to GitHub Pages.
- **Engine** (`src/engine/`) is pure TypeScript, no React: `applyAction(state, action) →
  state`, seeded RNG, fully deterministic and unit-testable (Vitest).
- **Data** (`src/data/`): regions, states, issues, parties, offices and every card as typed
  data files. Adding a state = adding data, not code.
- **UI** (`src/ui/`): React components reading state from a single store (Zustand or
  `useReducer`), map as inline SVG.
- **Persistence**: autosave current run to `localStorage`; Hall of Runs in IndexedDB
  (falls back to localStorage).
- **Balance harness**: a headless bot (`npm run sim`) plays N runs with simple strategies
  and prints win rates per office, so tuning is measured, not guessed.

Initial balance targets: a sensible player wins their hometown mayoral race ~70% of the
time; House ~55%; Governor from a rural base ~35% on the first try.

---

## 13. Out of scope for the POC (expansion backlog)

- All 15 states / 25 regions and a US map; relocating to another state.
- Presidential primaries and the presidency (national map from the 15 states).
- Random events & scandals, staff/campaign managers, rival politicians across runs.
- Legislative mechanics beyond single decision cards (coalitions, vote counts, vetoes).
- Third parties, ranked-choice mayoral races, demographics beyond issue opinion.
- Sound, animation polish, mobile layout tuning.
