# Workout Path: plan

A personal web app that holds my exercise catalog and lets me build workouts and routines, run them with timers, and track progress. Installable on the iPhone Home Screen and usable in the browser on the MacBook. It works offline.

## 1. Concepts

| Thing | What it is | Example |
|---|---|---|
| **Exercise** | One movement in the catalog, with a mode (reps / hold / time), a default dose and optional variations. | Hang (dead / active / L-sit) |
| **Variation** | A version of an exercise that can have its own mode and dose. | Push up → static hold (hold, 3×20 s) |
| **Workout** | An ordered list of blocks; each block holds items. | "Iso strength A" |
| **Block** | A group within a workout: straight sets, superset or circuit, with rounds and rest. | Warm-up circuit ×2 rounds |
| **Item** | Exercise + variation + dose (sets × reps / seconds / minutes, per side?, optional kg) + rest. | Wall sit, 3×45 s, rest 60 s |
| **Routine** | A schedule of workouts: weekly (Mon/Wed/Fri) or a rotation (A → B → C → A). | "3-day iso + flexibility" |
| **Session** | A workout I actually did: date, what I did per set, notes, RPE. | 2026-11-18, Workout A |

## 2. Catalog (done: `src/data/catalog.ts`)

Sections are grouped **by type of training**, because a workout is built that way (warm-up → strength → skill → flexibility). Each exercise is also tagged by **body region** (upper / lower / core / full), so "upper body / lower body / core" still works as a filter.

| Section | Exercises |
|---|---|
| Cardio & Plyo | Frog jump, Jump rope, Spinning |
| Mobility & Warm-up | Cat cow, Upward / downward dog, Glute bridge / reverse tabletop, Kneeling backbend, Hip flexor stretch, Deep squat hold |
| Stances | Horse stance, Wall sit, Bow stance, Crane stance |
| Core | Plank, Side plank, Hollow body, Superman, L / V sit, Dragon flag, Roman chair |
| Upper Push | Push up (standard / static / fingertip / one arm), Dips, Wall push, Wall push backwards, Iso strap press (overhead / chest / lateral) |
| Upper Pull | Pull up, Chin up, Hang (dead / active / L-sit), Iso pull up |
| Legs & Posterior Chain | Box squat, Bulgarian split squat, Cossack squat, Nordic curl, Reverse nordic, Iso deadlift |
| Skills & Balance | Handstand, Crow, Walk press, Planche |
| Flexibility | Wall split, Front split, Side split, Pancake, Pigeon, Jefferson curl |

45 exercises. Duplicates across my lists were merged (Superman, Hollow body, Handstand, Bow stance, L/V sit, Wall sit, Horse stance). Items written as "A / B" became one exercise with variations when they are versions of the same movement (Hang, Push up, Glute bridge), and separate exercises when they train different things (Horse stance vs Wall sit, Wall push vs Wall push backwards). The door-frame presses were dropped in favour of the isometric strap.

Each exercise has: `id`, `name`, `section`, `regions`, `mode`, `perSide`, `equipment`, default `dose` (optional `kg`), `variations`, a one-line `cue`, `aliases`.

`HOME_EQUIPMENT` lists what I have: wall, yoga mat, pull-up bar, dip bars, parallettes, Roman chair, spin bike, jump rope, a chair, isometric strap, the bed (anchor for Nordics) and a 12 kg kettlebell. It is the default for `settings.equipment`, and the catalog and picker can hide exercises that need anything else.

Later, custom exercises added in the app are saved in state next to the built-in ones (ids prefixed `u-`, so they never clash).

## 3. Screens

Tabs: **Today · Workouts · Routines · Catalog · History**

- **Today**: the routine's next workout, with a Start button. Also a "quick start" for any workout.
- **Catalog**: sections as groups, search, filters (region, mode, equipment, section). Exercise detail: cue, variations, default dose, my history and best for it.
- **Workouts**: list + builder. Add exercises from the catalog (picker with the same filters), pick variation, edit dose, reorder (drag on Mac, handle on iPhone), group into superset / circuit blocks, duplicate a workout.
- **Routines**: weekly or rotation schedule built from workouts; one routine is active.
- **Player** (full screen while working out): current item, big countdown for holds, rep counter for reps, rest timer between sets, "next up" preview, skip / back / pause, and logging of what I actually did (reps done, seconds held). Audio beeps (3-2-1, start, end), and the screen stays on (Wake Lock).
- **History**: sessions by date; per exercise: best hold, best reps, heaviest kg, volume over time (chart).

## 4. Layout: iPhone and MacBook

- **iPhone (~390 px)**: bottom tab bar, one column, sheets for editing, tap targets ≥ 44 px, safe-area padding for the notch and home bar. Player uses the whole screen with huge numbers readable from the floor.
- **MacBook (≥ 1024 px)**: sidebar nav, two panes (list on the left, detail / builder on the right). In the builder the catalog stays open beside the workout so exercises can be dragged in. Keyboard: space = pause/resume, → = next in the player.
- Light and dark themes from CSS tokens.

## 5. Tech (same stack as piano-path)

- Vite + React 19 + TypeScript, Node 22, plain CSS with tokens in `:root`, hash routing.
- PWA: `manifest.webmanifest`, 180 px apple-touch-icon, service worker (network first for the page, cache first for hashed assets), runs in standalone mode from the Home Screen.
- State: one app state in `localStorage` (`workoutPath.v1`), every change goes through `actions.ts`, `normalize()` keeps old saved copies loading.
- Sync between iPhone and Mac: a private GitHub Gist (`workout-path.json`), same pattern as piano-path. Merge rule: sessions are a union by id minus deleted ids (a delete loses to a later restore or edit); workouts / routines / custom exercises per-item by newer `updatedAt`.
- Export / import JSON as a backup.
- Deploy: GitHub Actions → GitHub Pages on push to `main`.
- Timers based on timestamps (not interval counting) so they stay correct when the phone locks or the tab is in the background. Audio starts only after a tap (iOS rule).

### State shape (first version)

```ts
{
  customExercises: Exercise[],
  workouts: { id, name, blocks: Block[], updatedAt, deletedAt? }[],
  routines: { id, name, kind: "weekly" | "rotation", days?, order?, pos?, updatedAt, deletedAt? }[],
  activeRoutine?: string,
  sessions: { id, workoutId, workoutName?, date, startedAt, endedAt, sets: SetLog[], note?, rpe? }[],
  sessionsDeleted: { id, at }[],
  settings: { restDefault, beeps, theme, equipment: Equipment[] },
  updatedAt
}
Block   = { id, kind: "straight" | "superset" | "circuit", rounds, restBetween, items: Item[] }
Item    = { id, exerciseId, variationId?, sets, reps?, seconds?, minutes?, kg?, perSide?, rest }
SetLog  = { itemId, exerciseId, variationId?, set, side?, reps?, seconds?, minutes?, kg?, skipped? }
```

## 6. Milestones

1. **Repo + plan + catalog**: done.
2. **Scaffold + Catalog view** (done): Vite app, layout for both screen sizes, tab nav, catalog list / search / filters / detail. PWA manifest + icons. Deploy to Pages so it can be installed on the iPhone right away.
3. **Workout builder** (done): create / edit / reorder / duplicate workouts, blocks (straight / superset / circuit), dose editing.
4. **Player** (done): run a workout with countdowns, rest timer, beeps, wake lock, logging actual results → saves a session.
5. **Routines + Today** (done): weekly / rotation schedules, Today picks the next workout.
6. **History + progress** (done): session list, per-exercise bests and charts.
7. **Sync + backup** (done): Gist sync, JSON export / import.
8. **Later ideas** (done except photos): custom exercises in the app, progression ladders (e.g. tuck → adv tuck → straddle planche, with "move up when you hit X s"), suggested dose increases, starter workout templates, photos / video links per exercise.

## 7. Decisions (2026-11-19)

- **Walk press**: the start of a press to handstand; instead of going all the way up, lift the feet a little and move forward. Added to Skills & Balance.
- **The checkbox list** (Superman … Nordic) is just part of the catalog, not a starter workout.
- **Spinning** is a spin bike.
- **Iso deadlift** uses the isometric strap.
- **Door-frame presses** dropped; replaced by the Iso strap press (overhead / chest / lateral).
- **Equipment at home**: see `HOME_EQUIPMENT` above.
- **Chair**: used for the Bulgarian split squat (back foot), the Jefferson curl (stand on it) and the Box squat (sit back to it).
- **Dragon flag** is done on the floor, gripping something heavy behind the head (a bed leg).
- **Kettlebell (12 kg)**: only for the Jefferson curl for now (its default dose is 12 kg).
- **Weight tracking**: yes. Optional `kg` on doses, items and logged sets.
