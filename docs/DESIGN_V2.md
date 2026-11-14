# Political Chronicle — Design v2: the game we're building

> v1 (`DESIGN.md`) describes the simulation engine built in M1–M6 and stays the reference for
> its formulas. This document sets the **product direction** on top of it: a casual-feeling
> but strategic **card roguelike** about political careers, premium on phones and tablets.
> Where the two disagree, v2 wins and v1 gets updated as each milestone lands.

---

## 1. What kind of game this is

| Pillar                           | What it means for mechanics and balance                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roguelike runs**               | A run is a career (sandbox) or a mission with a cycle limit (scenario). Failure ends the run but still pays out progress. Every run varies through opponents, card draws, the people you can hire and election-night swings. |
| **Cards are the interface**      | Decisions, events, skill training, people and artifacts are all cards. Every turn is a small hand of meaningful choices, never a spreadsheet.                                                                                |
| **Readable odds**                | You always see your chance of winning (the "needle"). Roguelike decisions need visible risk.                                                                                                                                 |
| **Short turns, short missions**  | A turn takes 60–90 s on a phone. A scenario takes 20–40 min (2–6 cycles). Sandbox careers last as long as you like and save anywhere.                                                                                        |
| **Election night is the payoff** | Each campaign builds toward a live, animated night with results streaming in, regions called and a few last-minute actions. It should feel like watching a game.                                                             |
| **Meta-progression, capped**     | Scenario rewards (artifacts, unlocks) make you stronger at the start of later runs, but never enough to skip the game: at most +10–15% win chance from a full loadout.                                                       |

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

| Combination                      | Early game (local and state races)                                                                                                                                                                                                                                              | Late game (national, post-POC)                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Native** (home = resident)     | Hometown bonus: 30% recognition and +0.10 favorability in your region; +5 starting standing with the state party ("one of ours").                                                                                                                                               | Only one state carries a "favorite son/daughter" bonus.                          |
| **Transplant** (home ≠ resident) | No hometown region (15% recognition). A **newcomer** trust penalty of −0.10 favorability statewide that fades over 8 years of residency. Counterweight: an **outside donor network** from your home state (+20% donor income) and an _Outsider_ tag that some scenarios reward. | Favorite-son bonus in **both** states in presidential primaries and the general. |

**Balance problem to watch:** the transplant's big payoff comes with the presidency, which is
after the first version. Without the early counterweights everyone would pick native. Target:
a native is ~10–12 points likelier to win their first mayoral race, while a transplant raises
~20% more money and has the stronger end-game.

**As built (M7):** a transplant's city knows them a little (25% recognition vs 30%; events
there get ×1.15 instead of ×1.25). Newcomer doubt is −0.10 favorability scaled by region type
(big city ×0.4, suburb ×0.7, mid-size ×1, small town ×1.2), fading over 8 years. It applies to
the vote and to primaries. Outside donors add a flat $1k per quarter × ECO/3. Measured: natives
win their first mayoral race 7 / 13 / 17 points more often (Watertown / Buffalo / NYC, ~12 on
average), and transplants raise ~29% more donor money.

### 2.2 Age

Same rules as now: more starting skill points with age (10 at 25, +1 per 5 years), less
energy after 50, and a shorter career, since it ends at 85. In scenarios, age mostly matters
through energy; in sandbox it sets how many cycles you get.

### 2.3 Background (7)

Each background gives **fixed skill points** plus some free points. It also gives
**state affinities** (+0.08 favorability statewide in favored states, −0.05 in disfavored
ones), a **perk** and a **weakness**.

| Background                             | Fixed points           | Favored states                    | Perk                                                                         | Weakness                                                                                  |
| -------------------------------------- | ---------------------- | --------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Army veteran**                       | LEA +2, ADM +1         | TX, GA, NC, AZ, WY; rural regions | Crisis cards cost half when declined; +5 favorability with rural voters      | DIP starts at 1                                                                           |
| **Public servant** (career politician) | ADM +2, STR +2         | NY, IL, MA                        | Starts with standing 40 in the best-fitting party and one Common person card | _Establishment_ tag: −0.05 favorability with independents; outsider scenarios penalize it |
| **Celebrity**                          | CHA +4, STR +1         | CA, NY, FL; urban regions         | Starts with 40% recognition statewide                                        | ADM, ECO and LAW start at 1; higher scandal risk; −10% credibility on policy topics       |
| **Lawyer**                             | LAW +3, DIP +1         | MA, IL, NY                        | Legal-challenge cards favor you; +credibility in debates                     | CHA starts at 1                                                                           |
| **Business executive**                 | ECO +3, ADM +1         | NY, TX, FL                        | Can self-fund: starts with $150k                                             | −credibility on labor and min-wage topics                                                 |
| **Community organizer**                | LEA +2, DIP +1         | IL, MI, PA, OH                    | Credible on labor, housing and the minimum wage (M14; see §12)               | ECO starts at 1                                                                           |
| **Doctor / scientist**                 | LAW +1, ADM +1, ECO +1 | MA, CO, WA                        | High trust: integrity 75; ×1.12 credibility on policy (M14)                  | Lower energy: −1 for the first two turns (still at the clinic)                            |

**As built (M7):** weaknesses are creation caps (a skill can't go above 2 at creation); points
that can't be placed because of caps are lost. Perk values were trimmed after the sim:
Celebrity 25% statewide recognition and ×0.8 policy credibility, Business $70k, Organizer
door-knocking ×1.2. First-mayoral-race win rates for a sensible bot (Watertown / NYC):
Veteran 61 / 61, Public servant 60 / 57, Celebrity 79 / 59, Lawyer 67 / 64, Business 76 / 44,
Organizer 73 / 51, Doctor 60 / 67. Celebrity is the strongest campaigner by design (CHA 5); its
cost comes later, in governing.

### 2.4 Skills (7)

These replace v1's Oratory, Charisma, Media Savvy, Digital, Policy, Negotiation and
Fundraising. Each runs 1–10, with the same caps by office (6 / 8 / 10); skill cards in the
Market still train +1.

| Code    | Skill          | What it covers                                                                                                 | Affects (mechanically)                                                                                                                                                                                                                               |
| ------- | -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CHA** | Charisma       | Public speaking, debates, interviews, inspiring crowds, connecting with voters                                 | Every campaign event (rallies, town halls, TV, cable, social, radio), debate performance, gaffe resistance, how fast favorability decays. Replaces v1 Oratory, Charisma, Media Savvy and Digital.                                                    |
| **ECO** | Economics      | Budgets, taxation, growth, public spending, financial crises                                                   | **Donor income** (money people trust you with) and fundraising events; in office: **budget cards** (tax, spending, bonds) land better and cost less approval, fiscal-crisis cards, and a state **budget balance** meter (Governor).                  |
| **DIP** | Diplomacy      | Negotiating, building coalitions, relationships with other politicians (and later foreign leaders)             | **Legislative deals**: bill passage when another party or chamber is involved; endorsements from other politicians; softens whip-vote penalties on bipartisan bills; international relations (presidency, post-POC).                                 |
| **STR** | Strategy       | Political intelligence, reading opponents, campaign tactics, spotting opportunities, anticipating consequences | **Preview precision** (exact effects at 5+); **opponent intel** (see their next moves); primary odds; election-night action efficiency; at 7+ you draw **4** decision cards and keep 3; career moves such as nomination odds and the timing of runs. |
| **ADM** | Administration | Running institutions, delivering services, managing officials, implementing policy                             | In office: slower approval wear; signed bills land harder ("execution"); success of multi-turn **project cards** (infrastructure, services); chief-of-staff synergy.                                                                                 |
| **LEA** | Leadership     | Loyalty, authority, crises, hard decisions, keeping the team united                                            | **Party standing gains** (your own party); crisis cards; cabinet effectiveness; morale (staff don't quit when money dips).                                                                                                                           |
| **LAW** | Law & Policy   | Legislation, constitutional limits, regulation, designing policy                                               | **Bill passage** base chance; legal challenges; reform cards; debate credibility on policy topics.                                                                                                                                                   |

How v1 mechanics map onto the new skills:

| v1 mechanic                      | v2 driver                                                            |
| -------------------------------- | -------------------------------------------------------------------- |
| Event multiplier (every medium)  | CHA (people cards such as a digital director add per-medium bonuses) |
| Gaffe chance                     | CHA                                                                  |
| Donor income, call time, dinners | ECO                                                                  |
| Effect preview precision         | STR                                                                  |
| Party standing gains             | LEA (own party) · DIP (deals across lines)                           |
| Credibility                      | LAW on policy topics, plus background                                |

**As built (M7):** CHA drives every event and the gaffe chance; ECO drives donors and
fundraising events, plus ×(0.8 + 0.04·ECO) on tax bills in office; DIP cushions standing
losses ×(1.2 − 0.05·DIP); STR gives exact previews at 5, opponent standings at 4, their likely
next move at 6, and a 4th decision card at 7; ADM scales approval wear ×(1.25 − 0.05·ADM) and
bill impact ×(0.8 + 0.04·ADM); LEA scales standing gains ×(0.8 + 0.05·LEA) and crisis costs
×(1.25 − 0.05·LEA); LAW drives credibility (and, in M8, bill passage).

Note on party relationships: **LEA** is about your own team and party, while **DIP** is about
everyone else (the other party, other chambers, other politicians). That keeps the two from
overlapping.

## 3. People cards: cabinet and campaign

People are cards you **buy once** in the Market; this is a casual game, so there's no contract,
no signing fee and no salary. Once bought, you either **assign** a card to its role, keep it in
**reserve** (the "back pocket") for a later role, or **discard** it, which is permanent. Resigning, moving to a new office or losing
an election never loses anyone.

| Role                                       | Active when                 | Boost           | Example perks                                                        |
| ------------------------------------------ | --------------------------- | --------------- | -------------------------------------------------------------------- |
| **Campaign manager**                       | You're running              | CHA / STR       | _Road warrior_: +1 energy per turn · _Spin doctor_: gaffes cost half |
| **Chief of staff**                         | You hold any office         | ADM / ECO / LEA | _Fixer_: declining a crisis costs half                               |
| **Party liaison**                          | In office as a party member | LEA / DIP       | _Whip shield_: standing lost with your party is halved               |
| **Legislative director** ("political rep") | Governor, House or Senate   | LAW / DIP       | _Across the aisle_: +10% passage against an opposing chamber         |

- **Getting people:** every turn the Market offers **one person** (alongside 2 skill and 3 event
  cards), weighted by rarity and never someone you already hold. One-time price: common $6k,
  rare $15k, epic $35k, legendary $70k, paid from donor and party money. A bought person
  fills their role right away if it's empty; otherwise they go to reserve. Later, campaign loot
  (M9) and scenario rewards (M10) can hand out people too.
- **Roster:** at most 6 people, assigned and reserve together. A full roster means
  discarding before you can take someone new.
- **Boosts** add to your skills only while the role is active (a legislative director does
  nothing for a mayor), up to 10.
- **Starting people:** a public servant starts with a common chief of staff from their old
  job.
- **Pool (M8):** 19 people: 6 campaign managers, 6 chiefs of staff, 3 party liaisons and 4
  legislative directors.

## 4. Legislature (new, needed for LAW, DIP and the legislative director)

From Governor up, and for House and Senate members, signing a bill now has a **passage
check**: `pass = base(chamber control) + 3% × LAW + 3% × DIP (only when you don't control the chamber) + director boost`.

- Chamber control is rolled per cycle (yours, split, or the other party's), so it's a
  roguelike variable you see in advance. **As built:** every even year; state legislatures
  lean with their state (NY is usually blue); Congress is 40% blue, 20% split, 40% red.
- **As built:** base chance 85% in your own chamber, 60% split, 35% against you, 50% for
  independents; +3% per LAW, +3% per DIP when it isn't your chamber, +10% _across the aisle_;
  clamped 10–97%. Crises and ethics cards always go through. A failed bill still counts for
  party standing (you voted), and you keep half the promise credit.
- A failed bill has no policy effect, but you keep half the promise credit ("you fought for
  it").
- Mayors skip this check (city councils are abstracted).

---

## 5. The campaign mini-game and election night

### 5.1 The campaign is its own short game

The election year's 4 turns play like a short roguelike run inside the career:

- **Each turn:** decisions, events (region × topic × medium), the Market and people, then
  opponents move.
- **Campaign loot** drops from milestones and events: hitting a poll target, winning a debate,
  a strong fundraising turn, an endorsement. Loot comes as money, extra cards and **items**.
- **Items** are one-shot cards with a use window. Some only work during the campaign, some
  only on election night, some in both:

| Item                                  | Earned by                               | Use                                                                                  |
| ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Volunteer list                        | Door-knocking streaks, organizer events | +2 ground-game tokens on election night                                              |
| Opposition research dossier           | Winning a debate, STR ≥ 6               | Campaign: one opponent loses favorability in a region · Night: none                  |
| Endorsement (union / sheriff / paper) | Decision cards, DIP                     | Campaign: +recognition and favorability with a group · Night: +turnout in one region |
| Last-minute ad reservation            | Fundraising turn over target            | Night: a late statewide nudge                                                        |
| Poll-watcher network                  | Party standing ≥ 60                     | Night: protects one close region from bad variance                                   |
| Celebrity surrogate                   | Celebrity background, CHA ≥ 7           | Campaign: free rally anywhere · Night: +turnout in an urban region                   |

- Unused campaign-only items expire on Election Day, and unused night items expire at the end
  of the night. Nothing carries over between campaigns except money and people, so each
  campaign stays self-contained.

### 5.2 Election night

1. Polls close region by region in waves; each region's "counted" percentage ticks up.
2. Running totals and a **win-probability needle** move as results arrive. The engine already
   draws the true result with noise, and the night reveals it gradually, with early counts
   noisier than late ones.
3. Regions are **called** (banner and sound) once a lead beats the remaining uncertainty. The
   race is called when the math is settled.
4. **Your night resources:** ground-game tokens (from the campaign), night items (loot) and the
   candidate's **abilities** (§5.3). Everything targets regions that are **not yet fully
   counted**, so timing matters: act early with little information, or wait and have fewer
   regions left.
   - _Mobilize turnout_ in a region (1 token): +0.5–1.5 points there, scaled by STR.
   - _Lawyers to the count_ in a close region (1 token, or the poll-watcher item): protects
     against bad variance.
   - _Late ad blitz_ (money or the ad-reservation item): small statewide nudge.
   - _Concede_ or _declare victory_ (flavor and integrity).

**Balance:** total achievable swing is capped at about 1–3 points, so the campaign decides
most races and election night decides the close ones (~20–30% of races, where the drama is).

### 5.4 As built (M9)

- **Milestones** (once per race), checked at the end of each campaign turn or when they happen:
  Front-runner → endorsement; Momentum (+3 points in a turn) → $6k; Debate win → dossier;
  Fundraising haul ($10k in a turn) → ad reservation; Ground game (3 door-knocks) → volunteer
  list; Party machine (nominee with standing 60+) → poll watchers; Underdog (10+ points
  down) → a free town hall.
- **Ground-game tokens:** 2 to start (+2 for organizers), +1 per door-knock (up to +4), plus 1
  per 2 energy left on the final turn.
- **Night:** 13 half-hour steps from 8 pm. Polls close by region type (suburbs first, cities
  last) and count over 4–8 steps; early returns skew by ±4 points and settle as the count
  fills in. The needle combines the counted vote with the polls for what's left, and a region
  or race is called at 2.5σ. _Mobilize_ adds 1.5 × (0.6 + 0.08·STR) points to the uncounted
  vote; _Lawyers_ recover 30% of a bad draw (max 0.5 points); the _late ad blitz_ costs $20k
  (market-scaled). Total night swing is capped at 1 point plus lawyers.
- **Measured** (`npm run sim`): in Watertown, ~7% of races are within 3 points; night actions
  flip about a third of those (~2% of all races) and never a blowout.

### 5.3 Candidate abilities (special skills)

Beyond the 7 skill levels, a candidate can carry **abilities**: named special moves that let
you break a rule once, or do something nobody else can. They are **earned by completing
missions** and become equippable in Sandbox, up to 2 per character, with more slots unlocked
later.

| Ability              | Earned from             | Effect                                                                |
| -------------------- | ----------------------- | --------------------------------------------------------------------- |
| **Barnstormer**      | Big city, small town ★★ | Once per campaign, hold one rally that counts in 2 regions            |
| **Rapid response**   | Hometown favorite ★★★   | Cancel the next gaffe or attack ad                                    |
| **Machine boss**     | Machine politics        | Election night: 3 free mobilizations in your home city                |
| **Comeback kid**     | The Comeback            | When you trail by 5+ points in the final turn, +1 energy and +1 token |
| **Crossover appeal** | Blue in a red district  | Partisan baseline counts 25% less against you                         |
| **Star power**       | The Underdog Superstar  | Recognition never drops below 50% statewide                           |
| **Iron discipline**  | Keep your word ★★★      | Breaking a promise costs half the integrity                           |

Abilities are the roguelike "build" layer: background plus abilities plus artifacts make a
distinct run. Each one should be worth about a few points in its niche, not a flat bonus.

## 6. States and regions

- **Playable states:** New York and California for this version, growing to about 10.
  Non-playable states exist only as home states.
- **Granularity scales with population.** Every region carries its population weight, so
  statewide races sum correctly at any level of detail.

| Phase        | Shape per playable state                                                                                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Now (v2)** | 5 regions: **2 cities**, **2 secondary areas** (mid-size cities or suburbs), **1 rural area**                                                                                                                                |
| **Later**    | Small states 2 areas (e.g. Rhode Island); NY 10–12 (3 in NYC, 3–4 other urban such as Buffalo, Rochester, Albany and Syracuse, plus Long Island, the Hudson Valley, the North Country and the Southern Tier); CA and TX more |

**v2 cut** (population shares approximate):

| State          | Cities                                            | Secondary                                                              | Rural                               |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| **New York**   | New York City (~43%), Buffalo & Western NY (~12%) | Long Island & Hudson Valley (~25%), Capital Region & Central NY (~11%) | North Country & Southern Tier (~9%) |
| **California** | Los Angeles (~33%), San Francisco Bay Area (~20%) | San Diego (~8%), Sacramento & Inland Empire (~20%)                     | Central Valley & the North (~19%)   |

- **Offices:** a mayor for each city and secondary area, plus the rural area's seat town
  (Watertown stays). One House seat per region (abstracted), plus Senate and Governor.
- **Migration:** NY goes from 4 regions to 5 (Buffalo splits out from a new Capital/Central
  region and the North Country). The existing balance targets get re-measured with the bot.

## 7. Rhythm of a cycle

Off-years (3 turns per year) are for **governing** or **preparing**: bills, training, hiring,
fundraising and building recognition where you'll need it. The election year (4 turns) is for
**campaigning**, while you still govern if you hold office. Then comes **election night**,
and results lead to the next cycle.

---

## 8. Game modes

### 8.1 Scenarios (missions)

A scenario is data: a preset or constrained character, a starting state (year, office, party,
funds), modifiers, **objectives with a cycle limit**, **star goals**, and rewards.

**Beginner track** (finishing it unlocks Sandbox):

| #   | Scenario                                                                           | Teaches                                        | Win (1★)     | ★★ / ★★★                            |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------- | ------------ | ----------------------------------- |
| 1   | **Hometown favorite**: win Watertown mayor as the favorite                         | Platform, events, polls                        | Win          | ≥ 55% · ≥ 60%                       |
| 2   | **Keep your word**: start as a first-term mayor; win re-election                   | Bills, approval, promises                      | Re-elected   | No broken promises · approval ≥ 60% |
| 3   | **Pick a side**: join a party and win the North Country House seat within 2 cycles | Parties, standing, nominations, partisan races | Win the seat | No primary needed · standing ≥ 70   |
| 4   | **Big city, small town**: from upstate, win Governor within 3 cycles               | Statewide campaigns, NYC, election night       | Governor     | First try · carry NYC               |

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

**As built (M10):** the 4 beginner scenarios are data (`src/data/meta.ts`): a preset character
(you choose the name), a starting year, optionally an office already held, party membership,
extra funds and an opponent-recognition modifier. Each has an objective with a deadline and 3
star goals. A run ends when the objective is met (stars scored at that moment) or the deadline
passes. Each scenario unlocks after a star on the previous one, and Sandbox after a star on all
four. Rewards pay out the first time you reach 1, 2 and 3 stars.

| Scenario             | Starts                                                                           | Objective                        | Stars                                    | Rewards (1★ / 2★ / 3★)                             | Bot win rate |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- | -------------------------------------------------- | ------------ |
| Hometown favorite    | Jan 2026 (blank), Watertown public servant, weak opponents (×0.55)               | Win Watertown mayor 2027         | win · 55%+ · 60%+                        | Campaign button / War chest / _Rapid response_     | ~85%         |
| Keep your word       | 2028, veteran mayor, 45% approval; the challenger campaigns 3 extra times a turn | Re-elected in 2031               | win · no broken promises · approval 60%+ | Lucky tie / Rolodex / _Iron discipline_            | ~85%         |
| Pick a side          | 2028, independent lawyer mayor; the House race opens on turn one                 | North Country House seat in 2028 | win · no primary · standing 70+          | Union hall key / _Crossover appeal_ / Debate notes | ~85–95%      |
| Big city, small town | 2029, moderate Red House member (standing 62), weak opponents (×0.4)             | Governor by 2034                 | win · first try · carry NYC              | _Comeback kid_ / — / —                             | ~85%         |

Measured in M14 with 80–150 bot runs each (`npm run sim`).

### 8.2 Sandbox

Unlocks after the beginner track. Pick home and resident state, background, age, points
(fixed plus free), abilities (earned in missions) and artifacts, then play a career for a chosen length (20 / 30 / 40 years) or
until it ends. Score with the legacy score and compare in the Hall of Runs.

### 8.3 Meta-progression: artifacts and unlocks

- **Artifacts** are passive perk cards you equip before a run: 2 slots at the start, up to 4
  as you progress. Examples: _Grandfather's campaign button_ (+5% hometown recognition),
  _Rolodex_ (start with a Common staff card), _Debate notes_ (your first debate can't gaffe),
  _Union hall key_ (+1 ground-game token per campaign).
- **Unlocks:** backgrounds, playable states, scenarios, **abilities** (§5.3), and **starting skill
  boosts** (+1 to a skill at creation, at most 2 equipped).
- **Rewards** are tied to stars, and repeat clears pay less, so you're pushed toward new
  scenarios.
- Some scenarios run in **"pure" mode** with no artifacts, for bragging rights.

**As built (M10):** 6 artifacts (campaign button, Rolodex, union hall key, war chest, lucky tie,
debate notes) and 4 abilities (rapid response, iron discipline, crossover appeal, comeback
kid). Artifacts work in scenarios and Sandbox; abilities only in Sandbox, 2 slots. Artifact
slots: 2, +1 at 6 stars, +1 at 10. Measured: two artifacts add ~0–5 points of win rate on the
beginner scenarios. The profile (stars, unlocks, artifacts, abilities, the last 50 runs) is
stored apart from the current run. The **legacy score** is office points × years served
(mayor 10, House 20, Senate 35, Governor 40), + 20 × promises-kept share, + 20 × peak
approval, + 5 per election won.

---

## 9. Mobile-first presentation

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

## 10. What changes in the current code

| Area             | Change                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Politician       | `homeState` (50), `residentState`/`residentRegion` (playable); background v2; **7 skills CHA / ECO / DIP / STR / ADM / LEA / LAW** remapped (save schema bump); abilities slots |
| Opinion & events | Native/transplant modifiers; background state affinity; CHA drives every medium, with people cards adding per-medium bonuses                                                    |
| Economy          | ECO drives donors; budget cards and the Governor's budget meter                                                                                                                 |
| Governing        | ADM (wear and execution), LEA (crises, own-party standing), DIP and LAW (legislature passage)                                                                                   |
| Staff            | Skill-card staff → **people cards** with roster, slots, salaries and firing                                                                                                     |
| Campaign         | **Loot**: items, money and cards from campaign milestones; items with use windows                                                                                               |
| Elections        | Instant resolution → **election-night timeline** (engine) and the animated screen (UI), using tokens, items and abilities                                                       |
| World data       | NY re-cut to 5 regions; California with 5 regions; mayors for cities and secondary areas                                                                                        |
| Modes            | Scenario framework (data, objectives, stars, rewards incl. abilities), profile store, Sandbox unlock                                                                            |
| Balance harness  | Bot plays each scenario; CI asserts its difficulty band                                                                                                                         |

The old M7 (stats and Hall of Runs) folds into the scenarios milestone as the run-results
screen.

## 11. Gameplay rework (M13, as built)

This section supersedes the Market (§3 pricing), automatic filing and the 4-step platform.

**Start.** A run starts blank on Jan 1 of the year before your hometown's mayoral election.
You have personal **wealth** (log-uniform by background, ×1.025 per year over 25: organizer
$15k–60k, veteran $40k–150k, public servant $60k–250k, doctor $250k–1.5M, lawyer $300k–2.5M,
celebrity $1.5M–25M, executive $3M–60M with a 4% chance of a $1B+ fortune), an empty campaign
war chest, and a free people pack (keep all three).

**Campaign window.** A race can be launched from 7 turns before Election Day (Jan of the year
before) to 4 turns before (Jan of the election year). Opponents campaign from the moment the
window opens, so a late launch gives them a head start. Statewide races are locked until you
have held office or average 35% recognition statewide; the President is always locked for now.

**Launch.** Four choices: a campaign chief (any roster member; their campaign stars count),
a self-donation from wealth into the war chest (above the office's norm, voters grumble: up to
−12 favorability; norms: small-city mayor $100k–300k, NYC $1M, House $500k, statewide $5M), up
to five topics, and optionally asking a party to take you. Launching deals a free campaign
action pack and a free political events pack (keep one of three from each).

**Topics.** Seven positions per issue: Strongly / Clearly / Leaning against, Neutral, Leaning /
Clearly / Strongly for (−2, −4/3, −2/3, 0, +2/3, +4/3, +2 on the opinion axis). The picker sorts
issues by importance to this race's voters and marks where voters and the parties stand.
After your first campaign, each new one may drop one topic, add topics up to five, and move one
existing topic by one step. A neutral position makes no promise.

**Joining a party.** You ask; the party decides: 15% + 60% × platform fit, +30% if you hold
office, +5% if you've won before, −20% to switch, +4% per party-liaison star (5–97%). A refusal
means waiting until next year.

**Packs.** Three cards each. People packs: keep any (roster of 10). Political events and
campaign actions: keep one (hands of 5 and 8). Odds per card — regular 75/22/3/0 (common, rare,
epic, legendary), golden 30/45/20/5, elite 0/35/45/20. Prices: people $8k / $30k / $100k,
events and actions $6k / $25k / $90k, paid from the war chest.

**People.** 30 people, each with 0–5 stars (half steps) in all four roles; a person's best role
matches their rarity (common 1.5–2.5, rare 2.5–3.5, epic 3.5–4.5, legendary 4.5–5). Per star:
campaign manager +6% campaign actions and +1 night token per 2 stars (while running); chief of
staff −8% approval wear and +6% political events (in office); party liaison +6% standing gains,
−6% losses, +4% join odds (always); legislative director +4% bill passage (in office).

**Political events.** 20 cards played with energy: approval boosts in office (up to "Pass a
very popular law", +20 approval), recognition, money, standing, integrity and training (+1 to a
skill, up to the office cap). Skills now grow only through training cards.

**Campaign actions.** The basic actions stay free (door-knocking, social post, call time); the
rest come from packs, with rarities, plus new cards (Rotary club lunch, Union hall rally,
College presentation and Viral video; topic cards persuade ×1.4 on their topics) and items
(Scandal published, Celebrity endorsement, and Late voters break your way: +1.5 points on the
uncounted vote, outside the night-action cap).

**Stances and bills.** Campaigning, decision cards are public stances (favorability). In office
they are bills: approval ×0.07 per unit of fit (was 0.04) plus a favorability effect, after the
legislature's vote, shown as a signing ceremony.

**Terms and the world.** Re-election is launched like any race. A term you don't defend ends
at New Year. Every office has a holder; each New Year the races you sat out are simulated
(partisan lean, incumbency) and recorded. The sitting holder runs against you 60% of the time.

## 12. Balance (M14, as measured)

All numbers are sensible-bot win rates from `npm run sim` (80–150 runs).

| Target (DESIGN_V2)                                   | Measured                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Beginner scenarios 80–90%                            | Hometown 83–86%, Keep your word 85%, Pick a side 84–95%, Big city 85%                   |
| Keeper re-elected ~100%, flip-flopper 2–30%, idle 0% | 100%, 0–5%, 0%                                                                          |
| Native vs transplant gap 10–12 points                | Watertown 15, Buffalo 12, NYC 5 (average 11)                                            |
| Backgrounds within ±8 points per area                | Watertown 65–75% (mean 71), NYC 45–56% (mean 52)                                        |
| A full loadout ≤ +10–15 points                       | +0–8                                                                                    |
| Self-funding without runaways                        | A $1B executive going all in does no better (Watertown 57% vs 80%, NYC 40% vs 43%)      |
| Election night decides close races                   | 9–15% of races are within 3 points; night actions flip 14–25% of those, never a blowout |

**Tuning that got there:** small-city mayoral opponents campaign 3 times a turn (NYC's
front-runner 2); House opponents 3.5 and statewide 2.5 (fractional activity is a chance of one
more event); natives start with +0.05 favorability (was +0.10) and transplants with 28%
recognition, a newcomer doubt of −0.03 and a home-state donor network worth $8k × ECO/3 a
turn; a transplant's city counts as home turf for events. Backgrounds: Celebrity 20% statewide
recognition and ×0.75 policy credibility; Lawyer debates ×1.4 and ×1.08 policy credibility;
Organizer LEA +2, DIP +1 (no extra Charisma, no token bonus); Doctor ×1.12 policy credibility
and −1 energy only for the first two turns.

**Sandbox difficulty:** Easy (opponents ×0.85 known, −0.5 events a turn), Normal, Hard
(×1.1, +0.5). First hometown race: Watertown 98 / 65 / 40%, NYC 88 / 50 / 40%.

**Still open:** the climber's first Governor try is rarely won (0–13%), and a Blue from the
North Country reaches the House only ~30% of the time. Both reflect the red-region, blue-state
tension by design, but expansion scenarios may want them less extreme.

## 13. Missions, trinkets and election day (M15, as built)

**The loop.** Try a mission, lose, come back with better points and trinkets, win. Beginner
missions are winnable with a sensible setup (casual game); advanced ones need a plan.

**Mission setup.** Every try shows the character in full and takes 5 extra skill points (no skill
above 7 at the start) and up to 2 trinkets (3 at 6 stars, 4 at 10). Skills keep growing through
skill cards, up to the office cap.

**Rarity.** Five tiers, colour by rarity only: common grey, uncommon green, rare blue, epic purple,
legendary gold. Social posts and town halls are common; an arena rally is rare; a national TV
interview is legendary. Better packs cost more and pay better odds.

**Trinkets.**

| Rarity    | Trinket                                          | Window           | Uses   | Effect                                                           |
| --------- | ------------------------------------------------ | ---------------- | ------ | ---------------------------------------------------------------- |
| Common    | Get-out-the-vote binder                          | Election Day     | 1/race | +1 point everywhere                                              |
| Common    | Phone bank                                       | After exit polls | 1/race | +0.8 points on the uncounted vote                                |
| Common    | Season tickets                                   | Campaign         | 2/race | Surprise appearance: +3 recognition, +3 favorability in a region |
| Common    | Open-door sign                                   | Governing        | 2/term | +3 approval in a region                                          |
| Common    | Campaign button, War chest                       | Passive          | –      | +5% home recognition; +$15k                                      |
| Uncommon  | Lucky tie, Rolodex, Union hall key, Debate notes | Passive          | –      | as before                                                        |
| Rare      | Rapid-response pager, Iron discipline            | Passive          | –      | as before                                                        |
| Epic      | Crossover appeal, Comeback kid                   | Passive          | –      | as before                                                        |
| Epic      | Gavel of the house                               | Governing        | 1/term | Force the vote: your next bill passes                            |
| Legendary | Star power                                       | Campaign         | 1/race | +5 recognition, +4 favorability across the race                  |

**Election day.** Mobilize before the polls open (trinket or the Vans to the polls card: share
points added to the draw). The night opens on the exit polls, a noisy (±1.2) read of the true
result; late-voter cards and trinkets act then, on the whole uncounted vote. Then the count.

**Governing decides re-election.** An incumbent's vote leans on job approval (weight 3) and their
own campaign events count ×0.6. Running for a different office, the campaign counts in full.

## 14. The electorate (M16, as built)

**Three levels of geography.** Cities (neighborhoods) for mayoral races, the state (districts) for
House and statewide races, and later the nation (states). Only the active race is simulated at the
finest level; everything else rolls up.

**Demographics.** Each area is a mix of age (young adults, adults, seniors), class (low, middle,
high) and education (no degree, high school / some college, college and beyond). A
neighborhood usually has one character: young middle-to-high-income college grads (young urban
professionals), affluent retirees, low-income no-degree mill blocks. From the mix and the place's
voting history the game derives, per topic, how voters stand and how much they care, plus which
media reach them.

**Cards and decisions land unevenly.** TV skews older, social media younger, radio to voters
without a degree; a union rally reaches working-class voters, a rotary lunch affluent ones. Laws
are judged by each neighborhood's own opinions. The strategy is to read the map: give up an area
that is out of reach and win the tied, populous ones.

**Tracker.** Every turn the map can show who leads each area (red, blue, gold for you as an
independent, grey where undecided voters are the biggest bloc) or how it shifted since last turn;
tap an area for each candidate's share and change. On election night the areas report one by one.
