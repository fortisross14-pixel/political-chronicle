# Political Chronicle — Game Design (v1 draft)

> A card-driven career simulator. You create a politician, start as an independent
> running for mayor, and climb (or crash) your way through the House, Senate and
> Governor's mansion — balancing what your voters want against what your party wants.
> Every run is recorded so you can compare careers.

---

## 1. Pillars

1. **The balancing act.** Voters reward you for doing what you promised and for
   positions that fit *their* region. Your party rewards you for sticking to *its*
   platform. In a red state as a Blue (or a blue city as a Red) those
   pull in different directions. That tension is the game.
2. **Where × What × How.** Every campaign action is a choice of *location*, *issue*
   (one of your 5 platform topics) and *medium* (TV, social, arena rally...). The same
   message can win one region and lose another.
3. **Money buys options.** Funds buy event cards (to campaign) and skill cards (to grow
   your politician). Fundraising is a resource loop, not a side activity.
4. **Short turns, long careers.** 3 turns per year, 4 in an election year (§2.1). A turn
   should take 1–3 minutes.
   A full career is 40–120 turns.
5. **Every run is data.** All stats are snapshotted every turn; finished careers go to
   the Hall of Runs for comparison.

---

## 2. Core loop

```
Create politician ─► Pick a race ─► Choose up to 5 platform topics (with stance)
        ▲                                  │
        │                                  ▼
        │                  ┌──────────── TURN ────────────┐
        │                  │ 1. Income (donors, party, salary)
        │                  │ 2. Draw 3 decision cards → apply 1–3, reject rest
        │                  │ 3. Spend Energy + Funds: play event cards
        │                  │    (location + platform topic)
        │                  │ 4. Buy cards in the Market (events / skills)
        │                  │ 5. Opponents act, polls update, end turn
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

The same turn structure is used while **campaigning** and while **governing**; only
the flavour of the decision cards and what gets scored changes.

### 2.1 Time: turns per year

- A **normal year has 3 turns** (Jan–Apr, May–Aug, Sep–Dec).
- An **election year has 4 turns** (one per quarter, the last ending on Election Day in
  November). An election year is any year in which a race you hold or are running for is
  decided.
- Each turn deals 3 decision cards, so a 4-year mayoral term is 3 + 3 + 3 + 4 = **13 turns**.
- Turn-length-dependent values (income, upkeep, opinion decay, aging) scale by the turn's
  months: `monthsFactor = months / 3` (1.33 in a 4-month turn, 1.0 in an election-year turn).
- A **campaign is the election year's 4 turns.** For a first run (not in office) you file at
  the start of an election year.

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
| **Fundraising** | Donor income per turn, fundraising events |

Derived (not trained directly):

- **Energy** – action points per turn. `Energy = 6 at age ≤ 40`, −1 per 10 years after.
  Event cards cost 1–3 Energy.
- **Integrity** – 0–100 reputation for keeping promises (see §6.3).
- **Recognition / Favorability** – per region (see §5).

### 3.3 Aging & career end

Age advances by the turn's length in months / 12. A run ends when you **retire**, **lose three elections in a
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
  partisanLean: number;     // -1 (strong DU / blue) .. +1 (strong RP / red)
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
alignment(x, r, i) = clamp(1 − |x − o| / 1.5, −1, +1)
```

A +2 stance in a region averaging −2 has alignment −1: talking about it there *hurts*.
Being 1.5 points away from voters is neutral; anything further costs you. (Tuned in M3: the
original `/ 2` let a stance on the wrong side of a moderate region still help.)

### 5.2 Vote intention

```
U(candidate, r) = 1.6·F·R            // being known & liked
                + 0.6·R              // familiarity / viability
                + w·partyFit         // DU: −lean, RP: +lean, Independent: 0;
                                     // w = 0.4 nonpartisan (mayor), 0.4 partisan
                + 0.3·incumbent      // AI incumbents; a player incumbent instead gets
                                     // 2·(approval − 0.5): judged on the record
                − indepPenalty(office)  // 0 mayor, 0.3 House, 0.5 statewide

share(c, r) = softmax over candidates of U / τ  (τ ≈ 0.5), with an "undecided" option

partisan races only: decided share = 0.5 × softmax share + 0.5 × partisan baseline
  baseline: Blue = clamp(0.5 − 0.3 × lean, 0.15, 0.85), Red = 1 − Blue, independents ~0.08
  (renormalized) — a floor, so even a famous candidate rarely tops ~75% in a safe seat
```

Statewide result = Σ_r population × turnout × share. On election day add polling noise
(σ ≈ 2.5 pts per region, partially correlated statewide). The **Government map** shows
vote intention per region as a diverging colour (you vs. the leading opponent).

### 5.3 Opponents

Each race spawns 1–2 AI candidates (2 in an urban mayoral race) with a lean, 5 platform topics
fitted to the local electorate, recognition and favorability, and a simple strategy: each
turn they hold 2–3 events on their best-fitting topic. 40% of the time the main opponent is
an incumbent (+0.25 recognition, +0.3 utility). Opponent quality will scale with office
level from M6.

Opponents hold 2 events per turn (NYC's minor second candidate holds 1), each worth
reach 0.06 and persuasion 0.055 × salience × alignment; mid-size and urban opponents start
better known. See §9 for current win rates.

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
| Call time *(Basic)* | $0 | 1 | — | Fundraising | 0 | 0 | → +Fundraising × $1.5k × (0.5 + R) |
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

**You pay when you buy, not when you play.** The Cost column is the Market price; holding the
event then costs only Energy. Prices scale with the media market of your race (or office, or
hometown): rural ×0.6, midsize ×0.8, suburban ×1.0, urban ×1.5, so an NYC TV buy costs $60k and
a Watertown one $24k. Filing for a race deals a free starter hand (town hall, radio interview,
televised debate); debates are only ever dealt, never sold.

The fundraising dinner raises `Fundraising × $4k × (0.5 + R)` and call time
`Fundraising × $1.5k × (0.5 + R)`; each earlier fundraiser in the same turn halves the next
(donors tire of being asked), and fundraisers don't tire voters of your topics.

**Resolution** for the target region `r`, topic `i`, your stance `x`:

```
m      = media[r][card.medium] × skillMult × fatigue × hometownBonus (1.25)
ΔR     = card.reach × m × (1 − R)
ΔF     = card.persuasion × m × salience[r][i] × alignment(x, r, i)
         × relevance(i, office) × credibility
F      = clamp(F + ΔF × (1 − |F|), −1, 1)
```

- **Spillover** applies the same formula at the stated percentage to the other regions of
  the state — **using each region's own alignment**. Your loud NYC message on LGBTQ
  rights is also heard in Watertown.
- **Fatigue**: same topic in the same region again within 2 turns → ×0.7 per repeat.
- **Credibility** = `(0.7 + 0.03 × Policy + 0.3 × consistency) / 1.15`, ×1.15 on your
  background's credible issues, where consistency is how well this stance matches your Record
  (flip-flopping is less persuasive).
- **Gaffe**: small chance on TV/cable/debate (`8% − 0.6% × Media Savvy`) of a negative swing.

The UI previews the *expected* effect in each region before you confirm (coarse for low
Policy skill, precise for high).

### 6.2 Skill cards (profile growth)

Bought in the Market, applied immediately, permanent.

| Card | Effect | Cost |
|---|---|---|
| Speech coach | +1 Oratory | $5k × current level |
| Retail-politics workshop | +1 Charisma, 1 Energy now | $5k × level |
| Media training | +1 Media Savvy | $5k × level |
| Hire a digital director | +1 Digital, $2k per 3 months salary (quits, taking the point, if unpaid) | $6k × level |
| Think-tank fellowship | +1 Policy, costs 2 Energy this turn | $4k × level |
| Mentorship with a party elder | +1 Negotiation, +5 party standing | requires party member (M6) |
| Donor network gala | +1 Fundraising, 1 Energy now | $8k × level |

(Prices cut to about a third of the first draft in M4 so a mayoral campaign budget of
$20–70k can afford one or two.)

Skill cards have a level cap per office (mayor ≤ 6, House ≤ 8, statewide ≤ 10) so growth
is paced by career progress.

### 6.3 Decision cards (3 per turn)

Every turn you are dealt **3 decision cards**. You must **apply at least 1 and up to 3**;
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
  partyPriority?: "DU" | "RP";        // marked as a whip vote for that party
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

### 6.4 Governing (M5)

In office, decision cards are bills and executive actions (33 for mayors: budgets, police,
zoning, transit, plants and pipelines, schools, social issues, crises such as a blizzard or
a burst water main, and ethics calls). They move **job approval** in your jurisdiction
instead of favorability; the rest of the state still hears them (30% favorability spillover).

- **Approval** starts at `0.5 + (vote share − 0.5) × 0.6 + 0.08` (honeymoon), clamped 0.3–0.8.
  Each signed bill moves it by `0.04 × Σ salience × alignment × relevance`, with diminishing
  returns; shelving a crisis card costs its `rejectCost` in approval.
- **Promises** are judged against the platform you won on: kept +0.02 approval and +2
  integrity; broken −0.08 approval and −5 integrity. Every kept/broken promise is logged.
- **Wear**: approval loses 0.025 per 3 months on its own — governing is hard.
- **Favorability follows approval**: each turn F moves 25% of the way toward
  `(approval − 0.5) × 1.5 + (integrity − 50) / 250`.
- **Events in office** use the platform you won on and move approval by half their
  favorability effect.
- **Re-election** opens automatically at the start of the term's last year (a 4-turn year);
  the platform builder is pre-filled with your winning platform. You keep governing while
  you campaign. The main challenger of a sitting mayor starts better known (+0.25) and
  campaigns harder (+1 event per turn). Losing ends the term.

**Balance (M5, `npm run sim`)** — re-election after a first term: a bot that keeps its
promises is re-elected ~100% (approval ~62% at filing); one that signs promise-breaking
bills ~2% in Watertown and ~32% in moderate Buffalo (approval 31–42%). Random events and
scandals (post-POC) should make safe incumbents less certain.

---

## 7. Offices & elections

| Office | Jurisdiction | Term | Campaign length | Partisan? | How to get on the ballot |
|---|---|---|---|---|---|
| Mayor | 1 region | 4 yrs = 13 turns | election year (4 turns) | No (independent OK) | Open — just file |
| U.S. House | 1 region | 2 yrs = 7 turns | election year (4 turns) | Yes | Party nomination (standing ≥ 40) or primary |
| U.S. Senate | state | 6 yrs = 19 turns | election year (4 turns) | Yes | Party nomination (standing ≥ 60) or primary |
| Governor | state | 4 yrs = 13 turns | election year (4 turns) | Yes | Party nomination (standing ≥ 60) or primary |
| *President (post-POC)* | nation | 4 yrs = 13 turns | election year (4 turns) + primaries | Yes | Presidential primaries (standing ≥ 75 + national recognition) |

House members are always in a 3-turn year followed by a 4-turn campaign year. Statewide
races are bigger, so the opponent starts stronger rather than the campaign being longer.

- **Losing** returns you to the race picker: retry the same race next cycle, pick another
  race you're eligible for, or retire.
- **Winning** starts the term. In the election year (final 4 turns) of a term you are
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

Two **fictional** parties in the POC, easy to map to real life but not the real ones:

| Party | Short | Colour | Mascot | Vibe |
|---|---|---|---|---|
| **Democratic Union** | DU, "the Blues" | blue | the Mule | centre-left coalition of cities, unions and progressives |
| **Republic Party** | RP, "the Reds" | red | the Mammoth | centre-right coalition of business, rural and religious voters |

Both have stylised platforms (a −2..+2 position and a priority weight on each issue). Independent is a
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

The state chapter blend is what makes "a Blue in a red state" playable: the local party
tolerates more deviation than the national one.

### 8.3 Standing (relationship)

`Standing` 0–100. Gains: applying platform-aligned decision cards (+), party-priority votes
with the party (++), Party unity events, mentorship cards, winning races, raising money
for others. Losses: voting against party priorities (−−), publicly attacking the party
platform in events, losing winnable races.

### 8.4 Party funds

Paid every turn to members:

```
partyFunds = officeBase × (standing / 100) × alignment² × competitiveness(race)
```

Competitive races get more money; safe seats and hopeless races get less.

### 8.5 The Party tab

- Side-by-side: your Record vs. party platform, issue by issue (with the state chapter
  shown).
- Standing, alignment, party funds over recent turns.
- **Request nomination**: lists upcoming races in your state with requirements and your
  odds (grant / primary / denied).

### 8.6 As built (M6)

- **Joining**: both parties invite you after your first race. Starting standing
  `20 + 40 × alignment`; switching costs 10 integrity and restarts at `10 + 30 × alignment`.
  You can't change parties mid-way through a partisan race.
- **Standing**: each applied card tag moves it by `1.5 × weight × agreement` (agreement −1..+1
  from the effective platform); whip votes (`partyPriority`) count ×3, and rejecting a whip
  card the party wanted costs 4. Wins +8 (partisan) / +3 (mayor), losses −5, primary ±3,
  party unity event +4, mentorship +5. Gains scale with Negotiation (`0.8 + 0.05 × skill`).
- **Party funds** per 3 months: mayor $3k, House $8k, Senate/Governor $20k ×
  standing/100 × alignment² × competitiveness (1 for a toss-up, 0.3 for a blowout, 0.6
  between races).
- **Primaries** (standing within 25 of the threshold): decided at the end of the election
  year's first turn by party voters:
  `logistic(4·(alignment − challenger) + 2·(standing − 50)/50 + 1.5·(R − R_challenger) + 1.2·F)`.
  Losing a primary doesn't cost a seat you hold.
- **Running from office**: allowed for any partisan office in your state (not another
  mayoralty). Win and you move up; lose the general and you give up your seat. In a
  re-election year you can swap the auto-filed re-election for another race until you lock
  its platform.
- **Partisan opponents**: a party member faces the other party's nominee; an independent faces
  both. They run halfway between the local electorate and their party's platform. House: base
  recognition 0.42, 60% incumbents, 4 events/turn; Senate/Governor: 0.20, 35%, 4 events/turn
  spread across the state.
- **Content**: 14 campaign moments for House/Senate/Governor races, 18 federal bills (House and
  Senate) and 18 Governor actions, with whip votes on both parties' signature bills.

**Balance (M6, `npm run sim`)** — a Watertown-born climber always joins the Reds (fit ~0.85 vs
~0.45). It wins the North Country House seat on its first try (a popular local mayor in a
Red +40 district), then the first try for Governor succeeds 22–42%; over ~18 years almost all
eventually get there because each statewide run builds recognition in NYC. The same path as a
Blue is brutal: 14% reach the House and 2% the Governor's mansion — the party won't always put
a Watertown-minded Blue on its ballot, and North Country voters won't elect one.

---

## 9. Economy

| Source | Formula (per turn) |
|---|---|
| Donors | `(1k + 1.5k × Fundraising × R̄) × phase × monthsFactor`, where R̄ is your recognition averaged over the jurisdiction (pop × turnout); phase = 1 while running, 0.5 in office, 0.25 out of politics; ×3 for statewide jurisdictions |
| Party | see §8.4 / §8.6 |
| Fundraising events | dinner and call time, see §6.1 |
| Salary | token: per 3 months mayor $1k, House $1.5k, Senate/Governor $2k |
| Staff | − upkeep per 3 months |

Income lands at the start of each turn (shown next to Funds in the header). Spending: event
cards, skill cards, staff. Funds carry over between races; a losing campaign that overspent
leaves you broke for the next one.

Card Market: each turn shows **6 offers** — 2 skill cards (below your cap, party-only cards
hidden from independents) and 4 event cards drawn by weight (town hall and radio most
common, arena rally rarest) — plus the always-available Basic cards. Hand limit 8.

**Balance (M4, `npm run sim`)** — sensible bot hometown mayoral win rates: Watertown ~70%,
Buffalo ~80%, NYC ~57% (≈69% average; target 70% ±10). Over ~6 years a bot that invests in
Fundraising reaches arena-rally money ($72k in Watertown) about 23% of the time vs ~0% for
one that doesn't.

---

## 10. Screens

Top-level tabs (plus a header with date, office, funds, energy, integrity):

### 10.1 Government
- **Map** of the state (POC: schematic SVG of New York's 4 regions). Toggle layers: vote
  intention, recognition, favorability, approval, partisan lean, issue salience for a
  selected topic.
- **Region panel**: demographics flavour, top 3 issues, media mix, your R/F there.
- **Decision tray**: this turn's 3 decision cards with apply / reject, and the
  "apply at least 1" rule enforced.
- **Hand & Market**: event cards (drag onto a region → pick topic → confirm) and the
  Market.
- **End turn** button.

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

- every turn the engine appends a `Snapshot` (date, office, funds, energy, integrity,
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
