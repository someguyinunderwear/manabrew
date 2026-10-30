# TO BE DELETED BEFORE PR

> **Temporary coordination / implementation brief.**
>
> This file exists only to seed development on `feature/game-lab-reproduction` and communicate intent to Codex or other implementation agents. It is **not product documentation** and **must be removed before the eventual pull request is opened or finalized**.

## Working name

**Game Lab — Replay, Reproduction Forks, and Scenario Sandbox**

The primary purpose is **bug reproduction and developer/user diagnostics**, not practice/training.

The system should make it possible to capture difficult real-game circumstances, share them, inspect how they arose, and reproduce them locally without requiring the original multiplayer participants to coordinate the same decisions again.

A second purpose is to construct entirely artificial states for renderer/UI testing and, where safely supported by an engine, rules-engine reproduction.

---

# Product goals

## 1. Capture real games and reproduce bugs later

A user should be able to encounter a bug and then retroactively preserve enough recent history to communicate or reproduce it later.

Desired workflow:

```text
Real multiplayer game
        ↓
Bug occurs
        ↓
Capture current state / previous turn / previous full turn cycle
        ↓
Open replay and inspect exact sequence
        ↓
Choose a valid pre-bug authoritative boundary
        ↓
Reproduce From Here
        ↓
Engine reconstructs the authentic state
        ↓
Detach from original multiplayer session
        ↓
Investigator controls every seat locally
        ↓
Repeat / vary the interaction without original players
```

Important capabilities:

- rolling recent-history capture so recording does not need to be enabled before the bug;
- visual replay of board/state changes;
- save/export/import/share replay packages;
- authoritative reconstruction where the engine supports it;
- ability to fork a reconstructed state into a local reproduction session;
- local investigator can control all seats independently;
- reset to the fork point and rerun an interaction repeatedly;
- preserve enough metadata to explain app/engine/version compatibility.

The intended use is closer to a debugger/reproduction harness than a training mode.

## 2. Construct artificial scenarios

A user/developer should be able to construct a board without naturally playing into it.

At minimum, the scenario editor should eventually be able to define:

- player/opponent count;
- player names and seats;
- life totals;
- poison and other player counters;
- mana pools;
- active player;
- priority player;
- turn number;
- phase/step;
- battlefield permanents;
- controller vs owner;
- tapped/untapped state;
- arbitrary permanent counters;
- hands;
- graveyards;
- exile;
- command zones;
- libraries / known ordered cards where desired;
- attachments, including cross-board attachments;
- combat relationships;
- spells/abilities represented on the stack;
- global state such as monarch, initiative, day/night where represented by protocol;
- intentionally illegal or unusual visual states for robustness testing.

Artificial visual states should be saveable/shareable and load through the normal board renderer.

---

# Critical architectural distinction

Do **not** conflate the following three concepts.

## A. Visual Scenario

An editable synthetic/captured `ClientGameView` used for UI/rendering reproduction.

Useful for:

- Hybrid/Focused/Overview board layout;
- Auto vs Free placement;
- counters;
- attachments;
- player HUDs;
- zones;
- stack presentation;
- combat presentation;
- card inspection;
- multiplayer layout bugs.

A visual scenario does **not** claim that it contains enough internal information for a rules engine to continue correctly.

## B. Authoritative Replay

A real game reconstructed by replaying the original start request/seed and recorded decisions through the actual engine.

Use this for faithful rules-engine bug reproduction and rewind.

For Forge, reuse the existing decision-journal / journal-rewind / replay-snapshot infrastructure. Do not replace it with `ClientGameView` serialization.

## C. Engine Scenario

An arbitrarily constructed state that a real rules engine can continue playing from.

This is a later/advanced capability and must not be assumed to follow automatically from Visual Scenario support.

Visible state may omit delayed triggers, temporary continuous effects, replacement-effect history, stack locals, choices made on entry, RNG state, engine caches, and other authoritative internals.

Do not block useful visual sandbox/replay work on solving arbitrary engine-state injection.

---

# Existing foundations to reuse

Before implementation, inspect current `main` and preserve current architecture.

Known relevant systems include:

- `src/game/manualTabletopApi.ts`
  - already creates a synthetic `ClientGameView`;
  - supports `replaceState`;
  - supports manual card creation/movement, tapping, counters, life/poison, library actions, etc.;
  - currently contains explicit 1v1 assumptions and `startMultiplayerGame` is not implemented.

- Manual Tabletop controls/runtime and manual room sync.

- `ClientGameView` / `ClientPlayerDto` in the game store.

- Forge decision journal / journal rewind.

- Forge `exportReplaySnapshot` / `restoreReplaySnapshot`.

- existing checkpoints and restore-vote UI/data.

- normal board renderer and display-event pipeline.

Do not introduce a second board renderer.

Do not create a parallel fake-game subsystem if Manual Tabletop can be generalized cleanly.

---

# Proposed system structure

Use a generic **Game Lab** shell with separate capability surfaces.

Suggested tabs/views:

```text
Game Lab
├── Replay
├── Sandbox
└── Library
```

The generic UI should query runtime capabilities instead of assuming every engine can perform every operation.

Conceptually:

```ts
interface GameLabCapabilities {
  visualCapture: boolean;
  visualScenario: boolean;

  authoritativeReplay: boolean;
  replayExport: boolean;
  replayImport: boolean;

  reproductionFork: boolean;
  arbitraryEngineScenario: boolean;
}
```

Exact names may change to fit current repository conventions.

---

# Rolling visual capture

Maintain a bounded client-side rolling history during active games.

Primary use case:

> Something broke just now. Preserve what led up to it.

Initial retention target should be approximately the previous **two complete turn cycles**, subject to a sensible memory ceiling.

Prefer correctness/simplicity over premature delta compression for the first implementation. Full immutable state frames are acceptable if bounded.

A visual frame conceptually needs:

```ts
interface ReplayFrame {
  sequence: number;
  timestamp: number;

  turn: number;
  step: string;

  activePlayerId: string | null;
  priorityPlayerId: string | null;

  reason:
    | "state"
    | "prompt"
    | "action"
    | "phase"
    | "stack"
    | "combat"
    | "manual-marker";

  gameView: ClientGameView;
  displayEvents?: DisplayEvent[];

  promptSummary?: {
    playerId?: string;
    type?: string;
  };
}
```

Adapt this to actual protocol/store types rather than forcing this exact interface.

Do not store card-art binary assets in captures.

---

# Replay UX

Replay should use the **normal ManaBrew board renderer** in read-only mode.

Desired controls:

- play/pause;
- previous/next event;
- previous/next phase;
- previous/next turn;
- timeline scrubber;
- playback speed;
- bookmarks/markers where practical;
- inspect cards normally;
- switch perspective where the capture actually contains safe data for it.

Important actions:

### Fork to Sandbox

Clone the selected visible frame into Manual Tabletop / Scenario Sandbox and unlock editing.

This is always a **visual-state fork** unless a real engine is involved.

### Reproduce From Here

Only available at a valid authoritative replay boundary supported by the active engine/capture.

This is **not practice mode**.

It should reconstruct the authentic engine state at the chosen boundary, detach from the original match, and create a local reproduction session.

---

# Reproduction Fork behavior

The key requirement is removing dependence on other human participants.

After reconstruction, allow the local investigator to control all seats.

Conceptually:

```text
Reproduction control

Player A — Manual
Player B — Manual
Player C — Replay original actions
Player D — Paused
```

Per-seat control modes may initially be narrower if architecture requires it, but the target is independent seat control.

Useful modes:

- Manual control by local investigator;
- replay original recorded actions where feasible;
- AI where existing engine/runtime supports it;
- paused/no automatic action.

Add:

### Reset to Fork Point

This should reconstruct/reset the local reproduction back to its starting boundary so the same interaction can be rerun repeatedly.

Example debugging loop:

```text
Attempt 1: Tidebinder targets trigger
Reset
Attempt 2: Stifle targets trigger
Reset
Attempt 3: alternative sequencing
```

The original online/multiplayer match must never be mutated by a reproduction fork.

---

# Example target bug workflow

A representative target is the previously observed interaction involving **The Vision and Scarlet Witch** and **Tishana's Tidebinder**.

The useful bug report should not require a developer to rebuild decks and play several turns until the circumstances happen again.

Ideal workflow:

```text
Open bug replay
↓
Navigate to Vision trigger on stack
↓
Reproduce From Here
↓
Engine reconstructs exact pre-response state
↓
Investigator controls Tidebinder seat and Vision seat
↓
Cast Tidebinder, target trigger
↓
Observe engine result
↓
Reset to Fork Point and vary test
```

This is the core reason authoritative replay + local all-seat control matters.

---

# Scenario Sandbox

Build on/generalize Manual Tabletop.

First remove the current hard-coded 1v1 assumptions so synthetic states can represent the same player range supported by normal tables.

Suggested editor structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ GAME LAB — SANDBOX                                          │
├───────────────┬───────────────────────────────┬──────────────┤
│ Players/Zones │            Board              │ Inspector    │
│               │                               │              │
│ Player 1      │         Opponent 2            │ Vivid Creek  │
│ Hand          │                               │              │
│ Graveyard     │     Opponent 1   Opponent 3   │ Controller   │
│ Library       │                               │ Owner        │
│ Exile         │                               │ Zone         │
│ Command       │          Local Player         │ Counters     │
│               │                               │ Tapped       │
│ Player 2      │                               │ Attached To  │
│ ...           │                               │ ...          │
├───────────────┴───────────────────────────────┴──────────────┤
│ Stack | Combat | Turn State | Global Effects | Validation   │
└──────────────────────────────────────────────────────────────┘
```

Use existing Scryfall/card search infrastructure.

Where practical, permit drag/drop between zones.

---

# Scenario editing requirements

## Players

Support editing fields already represented by the protocol/store, including where applicable:

- life;
- poison;
- mana pool;
- energy;
- experience;
- tickets;
- radiation;
- commander damage/casts;
- City's Blessing;
- monarch;
- initiative;
- active player;
- priority player.

## Cards/permanents

Support:

- card identity;
- owner;
- controller;
- zone;
- tapped state;
- face state where represented;
- token status;
- arbitrary counters;
- attachments;
- combat state where represented.

Do not hard-code counter types.

Relationships should use scenario-local stable IDs, not transient engine object IDs as the only link.

## Zones

Support normal represented zones:

- battlefield;
- hand;
- library;
- graveyard;
- exile;
- command;
- other protocol-supported zones as practical.

Library representation should distinguish exact known ordering from merely an unknown remaining count.

## Turn/phase

Allow setting:

- turn number;
- active player;
- priority player;
- normal Magic phase/step represented by protocol.

## Stack

Allow **visual construction** of spells/abilities on a stack for UI reproduction.

Do not imply that a synthetic visual stack is automatically executable by Forge or another rules engine.

## Combat

Allow visual attacker/blocker/defending-player relationships where feasible.

---

# Scenario validation

The editor should distinguish:

### Error

State cannot be represented safely, e.g. relationship points at a nonexistent object.

### Warning

State is representable but unusual/illegal in normal Magic.

### Engine limitation

The visual state is valid but cannot be resumed by a selected rules engine.

Do **not** generally prevent intentionally illegal states in the visual sandbox. They are useful for renderer robustness and regression testing.

---

# Replay / scenario file concepts

Use explicit schema versions and compatibility metadata.

Potential user-facing extensions:

```text
.mbreplay
.mbscenario
```

Initial payloads may simply be versioned JSON. Do not over-engineer a binary container initially.

A replay manifest should retain enough metadata to diagnose compatibility, such as:

- schema version;
- application version;
- git commit if available;
- engine kind;
- engine/runtime artifact/version where relevant;
- format;
- player count;
- capture range;
- perspective/redaction mode;
- presentation settings useful for UI reproduction.

Presentation metadata worth preserving where available:

- Auto vs Free placement;
- Hybrid / Focused / Overview;
- viewport size;
- device pixel ratio;
- relevant board preferences;
- local free-placement positions where needed.

Allow loading with captured presentation settings or current local settings.

---

# Privacy / hidden-information boundary

This is critical.

A normal shareable replay must not casually leak:

- hidden opponent hands;
- exact ordered libraries;
- hidden choices;
- verification witnesses or authoritative journal data containing private information.

Conceptually separate:

### Shareable Replay

Redacted/player-perspective visual replay suitable for ordinary bug reports and sharing.

### Authoritative Reproduction Package

Host/developer-oriented reconstruction data that may include hidden information and must carry an explicit warning.

Forge's authoritative journal/replay data should remain treated as trusted-host/private material.

If authoritative restoration is incompatible on a recipient system, the visual replay should still be viewable where possible.

---

# Implementation phases

Do not attempt everything in one PR.

## Phase 1 — Visual Game Lab foundation

Suggested first implementation target:

1. Define versioned generic visual replay/scenario schema(s).
2. Add bounded rolling `ClientGameView` capture.
3. Add read-only replay timeline using the normal board renderer.
4. Add export/import of visual captures.
5. Add **Fork to Sandbox**.
6. Generalize Manual Tabletop from hard-coded 1v1 assumptions to normal supported multiplayer player counts.
7. Add a basic Scenario Sandbox editor sufficient to manipulate players, zones, permanents, counters, mana, turn/phase, and attachments.
8. Save/load scenario files.
9. Add regression/serialization tests.

Avoid arbitrary engine-state injection in this phase.

## Phase 2 — Authoritative Forge reproduction

1. Surface existing Forge replay/decision-journal capability through Game Lab.
2. Connect valid replay boundaries to **Reproduce From Here**.
3. Reconstruct in an isolated engine instance using existing replay machinery.
4. Detach from original multiplayer orchestration.
5. Hand all seats to the local investigator or provide equivalent local seat switching.
6. Add **Reset to Fork Point**.
7. Add compatibility checks and safe failure behavior.
8. Add hidden-information warnings/export controls.

Do not weaken existing replay verification guarantees.

## Phase 3 — Advanced visual scenario tools

- richer stack editor;
- combat editor;
- arbitrary attachment graphs;
- known library ordering;
- more global-state controls;
- better scenario validation;
- scenario minimization helpers if useful.

## Phase 4 — Engine scenario research

Investigate whether constrained arbitrary playable-state injection is safe/maintainable for individual engines.

This is explicitly not required for the earlier phases.

---

# Acceptance / regression scenarios

At minimum, design the implementation so these can eventually be represented/reproduced.

## Hybrid layout

4-player synthetic board with many permanents distributed across opponents; reload and reproduce identical board population under Hybrid/Auto.

## Counters

`Vivid Creek` with 2 Charge counters; save/reload and verify rendering.

## Cross-board attachment

Player A controls/owns `Curiosity` attached to Player B's creature; save/reload and verify attachment/reference-pile behavior.

Also support owner != controller states.

## Tidebinder / Vision

Visual scenario:

- Vision on battlefield with counters;
- Tidebinder available to another seat;
- mana pool set appropriately;
- relevant trigger visually represented on stack;
- correct active player/priority/phase.

Authoritative reproduction target:

- replay reconstructs the authentic pre-response state;
- investigator can control both/all seats;
- cast Tidebinder targeting the trigger;
- observe result;
- reset to fork point;
- retry with alternate sequencing.

## Retroactive capture

After a bug occurs, save at least the previous full turn cycle without having explicitly started recording beforehand.

## Sharing

A second installation can import a shareable visual replay/scenario and reproduce the represented board without the original match.

---

# Architectural rules

1. **Do not treat `ClientGameView` as complete authoritative engine state.**
2. **Do not build a second board renderer.**
3. **Reuse/generalize Manual Tabletop for editable visual scenarios.**
4. **Reuse engine-native replay/reconstruction for authoritative reproduction.**
5. **Keep visual replay useful even if authoritative replay cannot be restored.**
6. **Version persisted schemas and design for migrations.**
7. **Use stable scenario-local identifiers for object relationships.**
8. **Replay is read-only until explicitly forked.**
9. **Permit intentionally illegal visual states, but validate/warn.**
10. **Treat hidden-information export as a privacy/security boundary.**
11. **Game Lab must not depend on Forge; Forge is a backend with richer capabilities.**
12. **Initial implementation should not require server-side persistence.**
13. **Do not modify or destabilize existing Hybrid board behavior as part of this feature.**
14. **Keep implementation reviewable and phase work into coherent PRs.**

---

# Codex implementation prompt

Use the following as the starting instruction when implementation begins:

> You are working on `feature/game-lab-reproduction` in the ManaBrew repository. Read repository guidance (`AGENTS.md` and any scoped guidance) before editing. Review the current implementation rather than relying solely on this note because `main` may have advanced.
>
> Design and begin the **Game Lab** system described in this temporary brief, prioritizing **Phase 1 — Visual Game Lab foundation**. The feature's primary long-term purpose is reliable bug reproduction: users should eventually be able to capture recent real gameplay, review it, share it, fork a visible state into an editable sandbox, and—using engine-native replay support in a later phase—reconstruct a real state and locally control all seats to reproduce multiplayer bugs without the original players.
>
> For this first phase, do **not** attempt arbitrary Forge/internal engine-state injection and do **not** replace Forge's existing replay/journal machinery. Keep the architectural boundary between visual state and authoritative engine state explicit.
>
> Before implementation:
>
> 1. Inspect current Manual Tabletop, runtime abstractions, game store types, display-event handling, replay/checkpoint systems, persistence/file patterns, and board rendering.
> 2. Identify the smallest reusable architecture for a versioned visual replay/scenario model.
> 3. Document any conflicts with the assumptions in this temporary brief before changing direction.
> 4. Preserve existing behavior and avoid unrelated refactors.
>
> Initial implementation goals:
>
> - bounded rolling visual state capture suitable for retroactively saving recent turns;
> - read-only replay playback using the normal board renderer;
> - versioned import/export for visual replay data;
> - `Fork to Sandbox` from a replay frame;
> - generalize Manual Tabletop beyond its current 1v1 assumptions to supported multiplayer layouts;
> - basic editable Scenario Sandbox for players, zones, cards/permanents, counters, mana pool, owner/controller, attachments, active player, priority, turn and phase;
> - save/load visual scenarios;
> - validation that distinguishes malformed state from unusual/illegal-but-intentional state;
> - tests for schema serialization/migration boundaries and representative board-state reproduction.
>
> Design APIs so Forge authoritative replay/reproduction can be added later without coupling generic Game Lab code to Forge. A capability interface is preferable to Forge conditionals scattered through UI code.
>
> Do not build a separate board renderer. Do not claim a `ClientGameView` scenario is a playable engine save-state. Do not expose hidden authoritative journal data through ordinary shareable replay exports.
>
> Use representative regressions while developing: multiplayer Hybrid board population, Vivid Creek charge counters, cross-board Curiosity-style attachments, and a Vision/Tishana's Tidebinder visual reproduction state.
>
> Keep commits scoped and reviewable. Report architecture decisions, tests run, unresolved engine limitations, and any follow-up work that should be split into later phases.
>
> **Before the eventual PR, delete `TO-BE-DELETED.md`. It is coordination material only and must not ship.**

---

# Before PR checklist

- [ ] Remove `TO-BE-DELETED.md` from branch history/tip before opening/finalizing the eventual PR.
- [ ] Ensure final product-facing docs contain only durable architecture/user documentation.
- [ ] Confirm no debug-only fixture or reproduction package containing hidden game information is committed.
- [ ] Verify Phase 1 does not claim arbitrary engine resume support.
- [ ] Verify existing Forge replay guarantees are unchanged unless a dedicated later-phase PR intentionally changes them.
- [ ] Verify Hybrid behavior has not regressed.
