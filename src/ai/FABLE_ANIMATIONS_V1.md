# Animation System — Context & Request (V1)

## What We're Asking For

We want to build a richer animation system for unit combat in DungeonCombat, starting with one class's **basic attack** as a proof of concept. Right now each animation state is a single static frame held for a fixed duration. We want multi-frame sequences — smooth, readable attacks that feel like they're actually happening.

This document explains the current system precisely enough for you to design the new one. Please deliver:

1. **A sprite sheet spec for the Wizard's basic attack** — how many frames, what poses, laid out in what order. Our artist will produce the actual pixel art from your spec. Be specific: name the pose, describe the body position, describe what's happening in the frame, and give a suggested hold duration in milliseconds. You have the 8 existing source frames as a reference for the character's style, proportions, and the poses already available to reuse or extend.

2. **Updated animation engine code** — a drop-in replacement for the `UnitFigure` component and the constants/helpers it depends on. The new code must support multi-frame sequences per animation state. Everything else in the file (board rendering, UI, turn logic) remains untouched — we only need the animation layer.

3. **Updated `playAttackAnim` function** — this is the sequencing layer that fires animation states in order (windup, then release, etc.). If the new system changes how sequencing works, show the updated version.

---

## Current System — Technical Spec

### Sprite Sheet Format

Each unit has **one PNG per diagonal facing direction** (4 directions: `ne`, `se`, `sw`, `nw`), and one sheet per team color (red/blue), and 8 poses. That's 64 PNGs per unit class.

Each PNG is a **horizontal strip of exactly 8 frames**, all the same size. The renderer clips to one frame at a time using `overflow: hidden` on the container and `translateX` to shift the image left by `frameIndex * frameWidth`.

Current frame dimensions: **253 × 271 px per frame** (so each sheet is 2024 × 271 px). The unit's feet land at y = 245px, so the container clips to 245px tall to exclude empty space below the feet.

### Frame Index Map (current — 8 frames, indices 0–7)

| Index | Animation state | Description |
|-------|----------------|-------------|
| 0 | `idle` | Standing at rest |
| 1 | `walk A` | Walk cycle frame 1 |
| 2 | `walk B` | Walk cycle frame 2 |
| 3 | `windup` | Attack windup / anticipation pose |
| 4 | `attack` | Basic attack release |
| 5 | `hit` | Flinch (received a hit) |
| 6 | `dodge` | Dodge / block (attack missed them) |
| 7 | `special` | Special ability release |

This frame order is **consistent across all 8 unit classes**. The animation engine does not have per-class frame maps — it uses one global index table.

### Current Renderer (React Native / Expo SDK 56)

```tsx
// One frame = one column in the horizontal strip
const flatIdx = ANIM_FRAMES[animState.anim][animState.frame];

<View style={{ width: cellSize, height: feetY, overflow: 'hidden' }}>
  <Image
    source={source}            // the PNG for this unit's facing direction
    style={{
      width: cellSize * 8,     // full strip width (8 frames)
      height: frameH,
      transform: [{ translateX: -flatIdx * cellSize }],
    }}
    resizeMode="stretch"
  />
</View>
```

`cellSize` is the tile size in pixels (varies with screen, typically ~95px on device). The image is stretched to fit `cellSize × 8` wide, so frame dimensions scale with the board.

### Current Animation State Machine

```ts
type AnimName = 'idle' | 'walk' | 'windup' | 'attack' | 'special' | 'hit' | 'dodge';

// Frame indices within the strip for each state
const ANIM_FRAMES: Record<AnimName, number[]> = {
  idle:    [0],
  walk:    [1, 2],     // alternates at WALK_FPS
  windup:  [3],
  attack:  [4],
  special: [7],
  hit:     [5],
  dodge:   [6],
};

// FPS per state
const ANIM_FPS: Record<AnimName, number> = {
  idle:    1,
  walk:    2000 / 450,       // 2 frames over one step duration
  windup:  1000 / 900,       // holds for 900 ms
  attack:  1000 / 750,       // holds for 750 ms
  special: 1000 / 750,
  hit:     1000 / 750,
  dodge:   1000 / 750,
};
```

Each animation state runs its frame array at the given FPS, then returns to `idle`. `walk` loops while moving and snaps to `idle` when the move ends. All others are one-shot.

### Current Sequencing Layer

```ts
const WINDUP_MS     = 900;
const STRIKE_HOLD_MS = 750;

function playAttackAnim(
  unitId: string,
  abilitySlug: string,
  isSpecial: boolean,
  facing: FacingDir,
): number {
  const fire = (anim: AnimName) => triggerUnitAnimFacing(unitId, anim, facing);
  fire('windup');
  const release: AnimName = isSpecial ? 'special' : 'attack';
  setTimeout(() => fire(release), WINDUP_MS);
  if (abilitySlug === 'ffh') return WINDUP_MS + 1000;  // extra AOE hang time
  return WINDUP_MS;   // ms until target flinch should fire
}
```

The return value tells the caller when to fire the target's `hit` or `dodge` animation.

### Facing Directions

Units face one of 8 directions. The attack always fires toward the target's tile. The renderer picks the correct PNG for the current facing at the moment the animation starts.

### What We're NOT Changing (yet)

- The 4-direction structure — keep it
- The `overflow: hidden` / `translateX` rendering approach — fine to keep or replace, as long as it works in React Native with `require()`-loaded local assets
- The `triggerUnitAnim` / `triggerUnitAnimFacing` callback dispatch model
- Everything outside the animation layer (board, UI, turn logic)

---

## What "Better" Looks Like

Right now every animation state is one static frame. A basic attack is:

> windup pose (held 900ms) → release pose (held 750ms) → idle

We want something like:

> frame 1 (pull back, 120ms) → frame 2 (full extension, 80ms) → frame 3 (follow-through, 120ms) → frame 4 (recovery, 100ms) → idle

The numbers are illustrative — you pick what looks right for the class. The point is: **per-frame timing control** and **multiple frames per animation state**.

We are starting with the **Wizard's basic attack** (Ice Blast — a ranged projectile cast). The 8 existing source frames are attached so you can see the character's style and what poses are already drawn.

### Constraints

- React Native (not web canvas, not a game engine). Animations must use React Native primitives: `Image`, `View`, `Animated`, `setTimeout`/`setInterval`, or `useEffect` + `setState`.
- Local assets only — all PNGs are `require()`'d at build time. No remote URLs, no dynamic imports.
- Sprite sheets must remain a single horizontal strip per facing per team color. The artist will produce them; just tell us how many columns (frames) the new sheet needs.
- If you expand beyond 8 frames, the new sheet width is `frameWidth × numFrames`. The renderer already handles arbitrary strip widths if `ANIM_FRAMES` entries index into the right columns.
- The `playAttackAnim` return value contract must be preserved: it returns the number of milliseconds until the **target's** reaction animation should fire.
- Performance: 8 units on screen simultaneously. Keep re-renders minimal.

---

## Deliverables Summary

1. **Sprite spec for one class** — which class, how many frames per animation state, what pose per frame, hold duration per frame, and the final column layout (so the artist knows what to draw in columns 0, 1, 2, …, N).

2. **Updated `UnitFigure` component** — supports per-frame timing rather than a single FPS for the whole state. Include updated `ANIM_FRAMES` (or equivalent) and `ANIM_FPS` (or equivalent) structures.

3. **Updated `playAttackAnim`** — if the sequencing model changes, show the new version.

4. If you change the `AnimName` type or the callback contract, show the minimal diff to `triggerUnitAnim` / `triggerUnitAnimFacing`.

---

## Files Attached

- `match_id_animation_excerpt.ts` — the full animation layer extracted from `app/match/[id].tsx`: type definitions, constants, `SPRITE_MAP`, `UnitFigure`, `playAttackAnim`, and the `triggerUnitAnim` helpers. Everything else in that 1800-line file is omitted.
- `RedSEWizard1.PNG` through `RedSEWizard8.PNG` — the 8 individual source frames for the Wizard (Red, SE facing), one file per frame. These are the high-resolution originals that were composited into the sprite sheet; the sprite sheet is a lower-quality stretched version of these. Frame numbers correspond directly to sprite sheet column indices 0–7 per the frame map above (RedSEWizard1 = index 0 = idle, RedSEWizard2 = index 1 = walk A, etc.).

We are starting with the Wizard as the proof-of-concept class. The Wizard's basic attack is a ranged ice blast — a clean projectile cast with a readable wind-up and release that should translate well to a multi-frame sequence.

You do **not** need to read or modify anything else in the codebase to complete this task.
