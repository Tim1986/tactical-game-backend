# ENCOUNTER_SPEC — the campaign encounter grammar (A1)

Companion to `CAMPAIGN_ROADMAP.md` (plan) and `src/campaigns/types.ts` (the
schema). This file fixes the SEMANTICS of every grammar feature so A2–A8
implement against decisions made once. If an implementation step needs to
deviate, update this file in the same commit and say why.

**Owner-locked invariant: arena is untouched.** Every mechanic here is
campaign-only. Engine extensions (e.g. terrain on MatchState) must be inert
when absent, arena code paths never populate them, and each A-step's tests
include an arena-unchanged check. Campaign-only mechanics do NOT enter
`rulebook.ts` (that is the arena rulebook with its enforced spec battery);
novel campaign rules are taught in encounter intro/objective text.

**The feature guard.** The schema deliberately leads the runtime. Content
using a not-yet-implemented feature throws at `buildEncounterState` (shared
by the mobile runner and campaignSim) via `assertEncounterSupported` —
loud failure, never a silent no-op. Each A-step deletes its entries from
`UNIMPLEMENTED` in `runtime.ts` as it lands.

---

## A2 — Terrain

- **Blocked tiles** (walls/pillars): impassable and opaque.
  - Movement: cannot enter or end on; pathing treats them like enemy-occupied
    tiles (hard blockers).
  - Line of sight: block single-target LoS exactly like a living unit on that
    tile (ABL-3 semantics).
  - Push/pull: the displacement walk stops short of a blocked tile (same rule
    as an occupied tile).
  - Leap (Leaping Slam): passes OVER blocked tiles; may not LAND on one.
  - Line abilities (Piercing Shot, Flame Jet): the ray stops at the first
    blocked tile — walls eat arrows and flame (owner 2026-08-14).
  - Placed AoE (Ring of Frost, Ring of Fire, placed blasts): two-part rule
    (owner 2026-08-14):
    1. The CASTER needs line of sight to the CENTER tile (the eye of the
       storm) — wall-opaque LoS. In campaigns this overrides arena ABL-3's
       "area abilities ignore line of sight" (arena semantics unchanged —
       there is nothing to block there).
    2. The effect spreads from the CENTER and does not pass through walls:
       an area tile is affected only if the center has wall-opaque line of
       sight to it. Wall tiles themselves are never affected. UNITS never
       block area spread (walls only). So a ring placed at the edge of your
       sight can curl partially out of your view — fine, you only need to
       see its eye — but it cannot put ice on the far side of a wall.
    Self-centred AoE (Whirlwind, Ground Slam, Leaping Slam's ring) uses the
    same center-spread rule with the caster (or landing tile) as center.
    Targeting previews must show exactly the affected set.
- **Phasing** (`moveFlags: ['phasing']` — Wraith/Specter): may move THROUGH
  blocked tiles but not end on them. Phasing does not ignore units. LoS/
  displacement rules unchanged for phasers.
- **Hazards** (`fire`): entering the tile by ANY means (move step, push,
  pull, leap landing, wave-spawn placement never spawns onto hazards)
  applies 1 stack of burning to the unit. Applied once per entry, not per
  turn standing. Ending a turn on a hazard is otherwise safe (the burn
  status itself keeps ticking). AI must value hazard tiles negatively when
  pathing and value pushing enemies onto them.
- **Theme** is renderer-only (tile palette); no gameplay meaning.
- Placement validation: no unit/ally/wave spawn may sit on a blocked tile;
  authored-content check at build time.

## A3 — Objectives

- `ObjectiveSpec { win: WinCondition[], loss?: LossCondition[], text }`.
  Omitted objective = `{ win: [all_enemies_dead] }`.
- Evaluation: after EVERY resolved action and at each round boundary.
  Win conditions are checked before loss conditions — a simultaneous
  win+loss resolves as a WIN (player-favoring tie).
- Party wipe is always an implicit loss. `round_reached` (win: survive) and
  `round_reached` (loss: deadline) are satisfied when that round COMPLETES.
- `units_dead(enemyKeys)`: the named enemies (all their instances in this
  encounter) are dead. Other enemies neither flee nor despawn in v1 — they
  keep fighting until the win fires.
- `units_at_tiles(scope, tiles, simultaneous)`: scope `any` = at least one
  living party unit on any listed tile (or ALL tiles at once if
  `simultaneous` — the two-buttons puzzle); `main` = the main character;
  `all` = every LIVING party unit on listed tiles (escape-the-map).
- `ally_at_tiles(allyKey, tiles)`: the escort reached the exit.
- UI: persistent objective banner (the `text` line) + round counter whenever
  any condition references rounds; loss/win reasons named in the result
  screen ("The caravan fell").
- Brain: enemies must play the objective — defend target tiles, focus the
  escort when hinted, stall when the player races a deadline. campaignSim
  must fail loudly if an objective kind is present that the brain doesn't
  model (BALANCE_GRID_METHODOLOGY rule: never sim a mechanic the AI can't
  play).

## A4 — Waves, doors, rooms

- **Waves** spawn onto the CURRENT board. Triggers: `room_cleared` (all
  currently-spawned enemies dead), `round(n)` (start of round n), `door`
  (a party unit ENDS its move on the tile). Spawn placement: authored tiles;
  if occupied, nearest free non-hazard tile (deterministic scan order).
- **Wave initiative (owner 2026-08-14): spawns act in the round they
  appear** — no free ambush round for the player. The party's committed
  order NEVER resets; new enemies WEAVE into the alternating pattern:
  they take the open enemy slots between the party's units (PC1, E1, PC2,
  E2, …), extras appending after the weave. Enemies woven into slots that
  come after the current initiative position act THIS round; slots already
  passed act from next round (no time travel). `surprise: true` on a wave/
  room (non-default, for designed player ambushes) delays the whole spawn's
  first turns to the next round.
- **Rooms**: when `rooms` is present it REPLACES the top-level enemies/
  enemyPlacement/terrain/waves entirely — `rooms[0]` is room 1, and the
  encounter-level `playerPlacement` is room 1's entry. Each later room
  defines `entryTiles`.
- **Doors between rooms** (`exitDoors` + `doorMode`):
  - `doorMode: 'on_clear'` (default): exit doors activate once the current
    room's enemies are all dead. Party steps on the door → transition.
  - `doorMode: 'always'`: the door works with enemies alive — bold play,
    ambush design. Enemies left behind are LOST from the encounter (they do
    not follow) and count as dead for later `all_enemies_dead` evaluation;
    designers pair 'always' doors with objectives that don't reward skipping.
  - Transition: same match continues. Party units keep HP, cooldowns,
    statuses, and initiative order; board re-carves to the new room's
    terrain; party is placed on `entryTiles` in party order; new room's
    enemies join initiative as a fresh wave. Round counter CONTINUES (it is
    the encounter's clock, not the room's).
- Objectives spanning rooms: `all_enemies_dead` means every enemy the
  encounter has spawned or will spawn in reached rooms; the win typically
  fires in the final room. Tile-based conditions reference the CURRENT
  room's coordinates.

## A5 — AI allies & escorts

- Allies are AI-controlled NPCs on the player's side. Never controllable;
  never a 5th party pick.
- Initiative: allies slot into the player's half of the interleave, after
  the party's committed units (they act on player turns, driven by the same
  brain loop that plays Fable, with an ally doctrine).
- Behavior modes:
  - `follow`: stays within 2 tiles of the main character; fights with its
    kit if it has one; retreats toward the party when threatened.
  - `hold`: does not move; fights from its tile.
  - `route(waypoints)`: each of its turns, advances up to its movement along
    the waypoint path (pathing around blockers/units); fights only in
    self-defense reach if kitted. THE escort mode.
- `abilities: []` = defenseless VIP (moves, never acts).
- Enemy `aiHints.priorityTarget: 'ally'` biases enemy scoring heavily toward
  attacking that ally; `'main'` likewise for the main character. The bias is
  a strong preference, not an absolute (enemies still take free kills).
- Ally death: no ability targeting restrictions — AoE friendly fire can hit
  allies (consistent with ABL-10); if an objective lists `ally_dead` it is a
  loss, otherwise the encounter continues without them.

## A6 — Novel monsters & abilities

- `CampaignDefinition.abilities`: normalized camelCase `AbilityDefinition`s,
  merged into the match's ability map at build (same mechanism as cooldown
  overrides — never mutating shared engine data). Enemy/ally `abilities`
  arrays may reference them.
- Arena-illegal is fine; balance is per-encounter via campaignSim.
- New effect kinds land HERE as needed, each with executor + brain scoring +
  sim verification before content may use it. Initial slate (build in this
  order as Campaign 2 demands them): `summon` (Necromancer), `teleport`
  (Specter repositioning), on-death effects (Zombie burst / Cultist ritual
  progress). Keep the slate demand-driven — no speculative effects.
- `artKey` routes enemy art independently of chassis (Skeleton art, fighter
  chassis). Idle-only art is shippable (B1); missing animation frames fall
  back to the idle frame.
- Boss pattern: a single high-HP enemy with a custom kit; the size/footprint
  question (multi-tile bosses) is explicitly OUT of scope until a campaign
  design demands it.

## A7 — Battle goals & boons

- Goals: 0–2 per encounter, shown with the objective before the fight,
  evaluated ONLY on a won encounter, from the match's event log + final
  state. Each goal maps to a campaign achievement (currency later, once a
  campaign economy exists). Difficulty does not change goals.
- Boons: granted by choice nodes (`grantBoon`), stored in run flags,
  applied at `buildCampaignPlayerInstance`/encounter build time for the
  REST of the run. Effects enumerated in `BoonEffect` — extend the type as
  designs demand; effects must stay small (a boon is a flavor-sized perk,
  not a build-around).
- campaignSim balances encounters WITHOUT boons (they're bonuses on top);
  a boon-inclusive sanity run is optional per campaign.

## A8 — campaignSim v2 (built for Opus to operate)

- The sim must PLAY every feature above (objectives, terrain pathing, waves,
  rooms, escorts, novel kits) — guarded by the same
  `assertEncounterSupported` seam, so an unsupported feature can't be
  silently mis-simmed.
- Deliverable is an Opus-operable workflow (owner call 2026-08-14):
  - one documented command per encounter + per campaign;
  - machine-readable pass/fail bands (win-rate targets by difficulty, from
    CAMPAIGNS.md Part 2) printed as PASS/FAIL, not raw tables to interpret;
  - the BALANCE_GRID_METHODOLOGY pitfalls enforced IN CODE: smoke-test-first
    mode, caffeinate wrapper, "mechanic actually modeled" assertions;
  - a tuning playbook: the legal knobs (HP, AC, counts, placement, rounds,
    hpScaleOverride) with expected effect sizes.
- Fable reviews once per campaign (spot-check, not in the per-encounter loop).

---

## The four-surfaces checklist (every A-step)

1. **Engine** — implemented + unit tests; arena-inert (arena states never
   carry the new fields; an arena regression check passes).
2. **AI brain** — enemies AND allies play the mechanic credibly; a probe
   script demonstrates it (like the Stalwart push probe).
3. **campaignSim** — can sim it; guard entry removed only when true.
4. **UI** — the player can SEE it (terrain art, objective banner, wave
   spawn moment, door affordance) and previews stay honest.
Then: owner feel-test on device.
