# Political Chronicle — Design v2: the game we're building

> v1 (`DESIGN.md`) describes the simulation engine built in M1–M6 and stays the reference for
> its formulas. This document sets the **product direction** on top of it: a casual-feeling
> but strategic **card roguelike** about political careers, premium on phones and tablets.
> Where the two disagree, v2 wins and v1 gets updated as each milestone lands.

---

## 1. What kind of game this is

| Pillar | What it means for mechanics and balance |
|---|---|
| **Roguelike runs** | A run is a career (sandbox) or a mission with a cycle limit (scenario). Failure ends the run but still pays out progress. Every run varies through opponents, card draws, the people you can hire and election-night swings. |
| **Cards are the interface** | Decisions, events, skill training, people and artifacts are all cards. Every turn is a small hand of meaningful choices, never a spreadsheet. |
| **Readable odds** | You always see your chance of winning (the "needle"). Roguelike decisions need visible risk. |
| **Short turns, short missions** | A turn takes 60–90 s on a phone. A scenario takes 20–40 min (2–6 cycles). Sandbox careers last as long as you like and save anywhere. |
| **Election night is the payoff** | Each campaign builds toward a live, animated night with results streaming in, regions called and a few last-minute actions. It should feel like watching a game. |
| **Meta-progression, capped** | Scenario rewards (artifacts, unlocks) make you stronger at the start of later runs, but never enough to skip the game: at most +10–15% win chance from a full loadout. |

**Balance rule of thumb.** Good play must beat bad play by a wide margin. That holds today:
a bot that keeps its promises wins re-election ~100% of the time, one that flip-flops ~2–30%,
and one that never campaigns 0%. Variance should decide close races, not blowouts.

---

## 2. The politician: four core traits

### 2.1 Home state × resident state

- **Home state**: where you were born. Any of the 50 states (the 35 non-playable ones only
  carry a small profile: lean, region type, affinity tags).
- **Resident state**: where your career happens. One of the playable states (POC: New York,
  then California). You also pick a **resident region** (your city).

| Combination | Early game (local and state races) | Late game (national, post-POC) |
|---|---|---|
| **Native** (home = resident) | Hometown bonus: 30% recognition and +0.10 favorability in your region; +5 starting standing with the state party ("one of ours"). | Only one state carries a "favorite son/daughter" bonus. |
| **Transplant** (home ≠ resident) | No hometown region (15% recognition). A **newcomer** trust penalty of −0.10 favorability statewide that fades over 8 years of residency. Counterweight: an **outside donor network** from your home state (+20% donor income) and an *Outsider* tag that some scenarios reward. | Favorite-son bonus in **both** states in presidential primaries and the general. |

**Balance problem to watch:** the transplant's big payoff comes with the presidency, which is
after the first version. Without the early counterweights everyone would pick native. Target:
a native is ~10–12 points likelier to win their first mayoral race, while a transplant raises
~20% more money and has the stronger end-game.

### 2.2 Age

Same rules as now: more starting skill points with age (10 at 25, +1 per 5 years), less
energy after 50, and a shorter career, since it ends at 85. In scenarios, age mostly matters
through energy; in sandbox it sets how many cycles you get.

### 2.3 Background (7)

Each background gives **fixed skill points** plus some free points. It also gives
**state affinities** (+0.08 favorability statewide in favored states, −0.05 in disfavored
ones), a **perk** and a **weakness**.

| Background | Fixed points | Favored states | Perk | Weakness |
|---|---|---|---|---|
| **Army veteran** | LEA +2, CHA +1 | TX, GA, NC, AZ, WY; rural regions | Crisis cards cost half when declined; +5 favorability with rural voters | COM starts at 1 |
| **Public servant** (career politician) | ADM +2, POL +2 | NY, IL, MA | Starts with standing 40 in the best-fitting party and one Common staff card | *Establishment* tag: −0.05 favorability with independents; outsider scenarios penalize it |
| **Celebrity** | CHA +3, COM +2 | CA, NY, FL; urban regions | Starts with 40% recognition statewide | ADM and LAW start at 1; higher scandal risk; −10% credibility on policy topics |
| **Lawyer** | LAW +3, POL +1 | MA, IL, NY | Legal-challenge cards favor you; +credibility in debates | CHA starts at 1 |
| **Business executive** | FUN +3, ADM +1 | NY, TX, FL | Can self-fund: starts with $150k | −credibility on labor and min-wage topics |
| **Community organizer** | LEA +1, CHA +1, POL +1 | IL, MI, PA, OH | +2 election-night ground-game tokens per campaign; door-knocking ×1.5 | FUN starts at 1 |
| **Doctor / scientist** | LAW +1, ADM +1, COM +1 | MA, CO, WA | High trust: integrity starts at 75; credible on healthcare and climate | Lower energy: −1 for the first cycle (still at the clinic) |

The user brief named five of these. Community organizer and Doctor / scientist are proposed
to reach seven.

### 2.4 Skills (7)

These replace v1's Oratory, Charisma, Media Savvy, Digital, Policy, Negotiation and
Fundraising. The brief only showed skills 4–7, so **CHA, COM and FUN are proposals** that
absorb the v1 skills.

| Code | Skill | Affects (mechanically) | Absorbs from v1 |
|---|---|---|---|
| **CHA** | Charisma | Rallies, town halls, door-knocking, debate presence; slows favorability loss | Oratory + Charisma |
| **COM** | Communication | TV, cable, social, radio, podcasts; gaffe resistance | Media Savvy + Digital |
| **FUN** | Fundraising | Donor income, fundraising events, signing fees for people cards | Fundraising |
| **POL** | Political intelligence | Preview precision; **opponent intel** (see their next moves); primary odds; election-night action efficiency; at POL ≥ 7 you draw **4** decision cards and keep 3 | Policy (previews) + Negotiation (maneuvering) |
| **ADM** | Administration | In office: slower approval wear, larger approval effects from signed bills ("execution"), success of multi-turn project cards (infrastructure) | — new |
| **LEA** | Leadership | Party standing gains, **crisis cards**, staff effectiveness, team morale (staff don't quit when funds dip) | Negotiation (party) |
| **LAW** | Law & Policy | **Bill passage** in the legislature (new, §4), legal challenges, debate credibility, reform cards | Policy (credibility) |

Caps by office stay as they are (6 / 8 / 10), and skill cards in the Market still train +1.

---

## 3. People cards: cabinet and campaign

People are cards you **buy** (signing fee plus salary each turn, paid from donor and party
money), **assign** to a slot, and **keep across roles**. Resigning, moving to a new office or
losing an election never loses them. **Firing** someone removes the card forever, with a small
integrity hit and a chance they turn up later on an opponent's staff.

| Slot | When | Boost | Example perks |
|---|---|---|---|
| **Campaign manager** | Always, when running | +1 energy per turn, event efficiency, opponent intel | "Ground general" +2 GOTV tokens · "Spin doctor" halves gaffe damage |
| **Chief of staff** | In office | +ADM (1–3) | "Fixer": once per term, cancel a bill's bad effect |
| **Party liaison** | In office, party member | +standing gains, softens whip-vote penalties | "Old guard": primaries count standing ×1.5 |
| **Legislative director** ("political rep") | Governor, House, Senate | +bill passage with other chambers (§4) | "Across the aisle": whip penalties halved on bipartisan bills |

- **Rarity:** Common, Rare, Epic, Legendary. Boosts range from +1 to +3 skill-equivalents,
  and Rare and above add a perk. Salary scales with rarity and your office.
- **The People market:** 2–3 candidates each turn, separate from the card Market. Legendary
  people are rare and expensive.
- **Roster:** at most 6 people, so you have to choose who to keep.
- **Balance target:** a full Rare cabinet should be worth roughly +2 skill levels where it
  applies. Salaries should be enough that a broke politician can't keep an all-star team.
  Today's digital-director skill card becomes a Common person card.

---

## 4. Legislature (new, needed for LAW and the legislative director)

From Governor up, and for House and Senate members, signing a bill now has a **passage
check**: `pass = base(chamber control) + 4% × LAW + director boost`.

- Chamber control is rolled per cycle (yours, split, or the other party's), so it's a
  roguelike variable you see in advance.
- A failed bill has no policy effect, but you keep half the promise credit ("you fought for
  it").
- Mayors skip this check (city councils are abstracted).

---

## 5. Election night

The campaign year builds toward a **live, animated night**:

1. Polls close region by region in waves; each region's "counted" percentage ticks up.
2. Running totals and a **win-probability needle** move as results arrive. The engine already
   draws the true result with noise, and the night reveals it gradually, with early counts
   noisier than late ones.
3. Regions are **called** (banner and sound) once a lead beats the remaining uncertainty.
   The race is called when the math is settled.
4. **Actions** spend **ground-game tokens** earned during the campaign. Tokens come from
   door-knocking and organizer events, the campaign manager and unspent energy in the final
   turn. Actions only work on regions that are **not yet fully counted**, so timing matters:
   act early with little information, or wait and have fewer regions left.
   - *Mobilize turnout* in a region: +0.5–1.5 points there.
   - *Lawyers to the count* in a close region: protects against bad variance.
   - *Late ad blitz* (costs money): small statewide nudge.
   - *Concede* or *declare victory* (flavor and integrity).

**Balance:** total achievable swing is capped at about 1–3 points, so the campaign decides
most races and election night decides the close ones (~20–30% of races, where the drama is).

---

## 6. Rhythm of a cycle

Off-years (3 turns per year) are for **governing** or **preparing**: bills, training, hiring,
fundraising and building recognition where you'll need it. The election year (4 turns) is for
**campaigning**, while you still govern if you hold office. Then comes **election night**,
and results lead to the next cycle.

---

## 7. Game modes

### 7.1 Scenarios (missions)

A scenario is data: a preset or constrained character, a starting state (year, office, party,
funds), modifiers, **objectives with a cycle limit**, **star goals**, and rewards.

**Beginner track** (finishing it unlocks Sandbox):

| # | Scenario | Teaches | Win (1★) | ★★ / ★★★ |
|---|---|---|---|---|
| 1 | **Hometown favorite**: win Watertown mayor as the favorite | Platform, events, polls | Win | ≥ 55% · ≥ 60% |
| 2 | **Keep your word**: start as a first-term mayor; win re-election | Bills, approval, promises | Re-elected | No broken promises · approval ≥ 60% |
| 3 | **Pick a side**: join a party and win the North Country House seat within 2 cycles | Parties, standing, nominations, partisan races | Win the seat | No primary needed · standing ≥ 70 |
| 4 | **Big city, small town**: from upstate, win Governor within 3 cycles | Statewide campaigns, NYC, election night | Governor | First try · carry NYC |

**Advanced scenarios** (examples):

- **The Underdog Superstar**: a Celebrity with no experience, CA resident. Get elected,
  govern, and win re-election within 4 cycles. Huge recognition but low ADM and LAW, so
  governing is the hard part.
- **Blue in a red district**: a Democratic Union member in North Country. Win and hold the
  House seat for 3 terms without dropping below standing 40.
- **The Carpetbagger**: a Texas-born transplant in New York. Win statewide before the
  newcomer penalty fades.
- **Machine politics**: a public servant in NYC whose party boss demands every whip vote.
  Reach Governor without falling below integrity 50.
- **The Comeback**: start out of office after a scandal (integrity 30) and win anything
  within 2 cycles.

**Difficulty bands** (measured by the bot in CI, one band per scenario): beginner 80–90%
for sensible play; intermediate 50–65%; hard 25–40% on the first attempt. A full artifact
loadout adds at most 10–15 points.

### 7.2 Sandbox

Unlocks after the beginner track. Pick home and resident state, background, age, points
(fixed plus free) and loadout, then play a career for a chosen length (20 / 30 / 40 years) or
until it ends. Score with the legacy score and compare in the Hall of Runs.

### 7.3 Meta-progression: artifacts and unlocks

- **Artifacts** are passive perk cards you equip before a run: 2 slots at the start, up to 4
  as you progress. Examples: *Grandfather's campaign button* (+5% hometown recognition),
  *Rolodex* (start with a Common staff card), *Debate notes* (your first debate can't gaffe),
  *Union hall key* (+1 ground-game token per campaign).
- **Unlocks:** backgrounds, playable states, scenarios, and **starting skill boosts** (+1 to a
  skill at creation, at most 2 equipped).
- **Rewards** are tied to stars, and repeat clears pay less, so you're pushed toward new
  scenarios.
- Some scenarios run in **"pure" mode** with no artifacts, for bragging rights.

---

## 8. Mobile-first presentation

- **Phone, portrait:** a slim top bar (date, funds, energy, needle or approval), the map in the
  middle, the **card hand at the bottom** (drag a card onto a region, then pick a topic), and
  **decisions as a swipe stack** (right to apply, left to reject, with the "at least 1" rule
  shown). Bottom nav: Government · Profile · Party.
- **Tablet, landscape:** map and hand on the left, panels on the right.
- **Juice:** card flips, count-ups, region fills, the needle, "called" banners, light haptics
  and sound (later).
- **Tech:** stay on React + Vite and add Framer Motion for animation. Ship as an installable,
  offline PWA, then wrap with Capacitor for the iOS and Android stores (premium, one-time
  purchase). The SVG map is fine for performance.
- **Saves:** the run autosaves every action. Meta-progression (unlocks, artifacts, Hall of
  Runs) lives in a separate profile store.

---

## 9. What changes in the current code

| Area | Change |
|---|---|
| Politician | `homeState` (50), `residentState`/`residentRegion` (playable); background v2; 7 skills renamed and remapped (save schema bump) |
| Opinion & events | Native/transplant modifiers; background state affinity; CHA/COM replace the 4 v1 media skills |
| Governing | ADM (wear and execution), LEA (crises, standing), LAW + legislature passage |
| Staff | Skill-card staff → **people cards** with roster, slots, salaries and firing |
| Elections | Instant resolution → **election-night timeline** (engine) and the animated screen (UI), with tokens and actions |
| Modes | Scenario framework (data, objectives, stars, rewards), profile store, Sandbox unlock |
| Content | 2nd playable state (California, 3 regions) for the celebrity scenario; 4 beginner and ~5 advanced scenarios; artifact set |
| Balance harness | Bot plays each scenario; CI asserts its difficulty band |

The old M7 (stats and Hall of Runs) folds into the scenarios milestone as the run-results
screen.
