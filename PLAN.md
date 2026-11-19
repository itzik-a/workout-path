# Workout Path: plan

A personal web app that holds my exercise catalog and lets me build workouts and routines, run them with timers, and track progress. Installable on the iPhone Home Screen and usable in the browser on the MacBook. It works offline.

## 1. Concepts

| Thing | What it is | Example |
|---|---|---|
| **Exercise** | One movement in the catalog, with a mode (reps / hold / time), a default dose and optional variations. | Hang (dead / active / L-sit) |
| **Variation** | A version of an exercise that can have its own mode and dose. | Push up → static hold (hold, 3×20 s) |
| **Workout** | An ordered list of blocks; each block holds items. | "Iso strength A" |
| **Block** | A group within a workout: straight sets, superset or circuit, with rounds and rest. | Warm-up circuit ×2 rounds |
| **Item** | Exercise + variation + dose (sets × reps / seconds / minutes, per side?) + rest. | Wall sit, 3×45 s, rest 60 s |
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
| Upper Push | Push up (standard / static / fingertip / one arm), Dips, Wall push, Wall push backwards, Door frame press (sides), Door frame press (top) |
| Upper Pull | Pull up, Chin up, Hang (dead / active / L-sit), Iso pull up |
| Legs & Posterior Chain | Box squat, Bulgarian split squat, Cossack squat, Nordic curl, Reverse nordic, Iso deadlift |
| Skills & Balance | Handstand, Crow, Planche |
| Flexibility | Wall split, Front split, Side split, Pancake, Pigeon, Jefferson curl |

45 exercises. Duplicates across my lists were merged (Superman, Hollow body, Handstand, Bow stance, L/V sit, Wall sit, Horse stance). Items written as "A / B" became one exercise with variations when they are versions of the same movement (Hang, Push up, Glute bridge), and separate exercises when they train different things (Horse stance vs Wall sit, the four wall / door-frame presses).

Each exercise has: `id`, `name`, `section`, `regions`, `mode`, `perSide`, `equipment`, default `dose`, `variations`, a one-line `cue`, `aliases`.

Later, custom exercises added in the app are saved in state next to the built-in ones (ids prefixed `u-`, so they never clash).

## 3. Screens

Tabs: **Today · Workouts · Routines · Catalog · History**

- **Today**: the routine's next workout, with a Start button. Also a "quick start" for any workout.
- **Catalog**: sections as groups, search, filters (region, mode, equipment, section). Exercise detail: cue, variations, default dose, my history and best for it.
- **Workouts**: list + builder. Add exercises from the catalog (picker with the same filters), pick variation, edit dose, reorder (drag on Mac, handle on iPhone), group into superset / circuit blocks, duplicate a workout.
- **Routines**: weekly or rotation schedule built from workouts; one routine is active.
- **Player** (full screen while working out): current item, big countdown for holds, rep counter for reps, rest timer between sets, "next up" preview, skip / back / pause, and logging of what I actually did (reps done, seconds held). Audio beeps (3-2-1, start, end), and the screen stays on (Wake Lock).
- **History**: sessions by date; per exercise: best hold, best reps, volume over time (chart).

## 4. Layout: iPhone and MacBook

- **iPhone (~390 px)**: bottom tab bar, one column, sheets for editing, tap targets ≥ 44 px, safe-area padding for the notch and home bar. Player uses the whole screen with huge numbers readable from the floor.
- **MacBook (≥ 1024 px)**: sidebar nav, two panes (list on the left, detail / builder on the right). In the builder the catalog stays open beside the workout so exercises can be dragged in. Keyboard: space = pause/resume, → = next in the player.
- Light and dark themes from CSS tokens.

## 5. Tech (same stack as piano-path)

- Vite + React 19 + TypeScript, Node 22, plain CSS with tokens in `:root`, hash routing.
- PWA: `manifest.webmanifest`, 180 px apple-touch-icon, service worker (network first for the page, cache first for hashed assets), runs in standalone mode from the Home Screen.
- State: one app state in `localStorage` (`workoutPath.v1`), every change goes through `actions.ts`, `normalize()` keeps old saved copies loading.
- Sync between iPhone and Mac: a private GitHub Gist (`workout-path.json`), same pattern as piano-path. Merge rule: sessions are a union by id minus deleted ids; workouts / routines / custom exercises per-item by newer `updatedAt`.
- Export / import JSON as a backup.
- Deploy: GitHub Actions → GitHub Pages on push to `main`.
- Timers based on timestamps (not interval counting) so they stay correct when the phone locks or the tab is in the background. Audio starts only after a tap (iOS rule).

### State shape (first version)

```ts
{
  customExercises: Exercise[],
  workouts: { id, name, blocks: Block[], updatedAt }[],
  routines: { id, name, kind: "weekly" | "rotation", days | order, updatedAt }[],
  activeRoutine?: string,
  sessions: { id, workoutId, date, startedAt, endedAt, sets: SetLog[], note?, rpe? }[],
  sessionsDeleted: string[],
  settings: { restDefault, beeps, theme },
  updatedAt
}
Block   = { id, kind: "straight" | "superset" | "circuit", rounds, restBetween, items: Item[] }
Item    = { id, exerciseId, variationId?, sets, reps?, seconds?, minutes?, perSide?, rest }
SetLog  = { itemId, exerciseId, variationId?, set, side?, reps?, seconds?, minutes?, skipped? }
```

## 6. Milestones

1. **Repo + plan + catalog**: done.
2. **Scaffold + Catalog view**: Vite app, layout for both screen sizes, tab nav, catalog list / search / filters / detail. PWA manifest + icons. Deploy to Pages so it can be installed on the iPhone right away.
3. **Workout builder**: create / edit / reorder / duplicate workouts, blocks (straight / superset / circuit), dose editing.
4. **Player**: run a workout with countdowns, rest timer, beeps, wake lock, logging actual results → saves a session.
5. **Routines + Today**: weekly / rotation schedules, Today picks the next workout.
6. **History + progress**: session list, per-exercise bests and charts.
7. **Sync + backup**: Gist sync, JSON export / import.
8. **Later ideas**: custom exercises in the app, progression ladders (e.g. tuck → adv tuck → straddle planche, with "move up when you hit X s"), suggested dose increases, starter workout templates, photos / video links per exercise.

## 7. Open questions

- **"Walk presses"**: what is this? Wall presses (same as Wall push?), or something else? Left out of the catalog until clear.
- **The checkbox list** (Superman … Nordic): is it a current routine / favorites to seed as the first workout, or just part of the catalog?
- **Spinning**: assumed a spin bike. Correct?
- **Iso deadlift**: assumed pulling on a strap / towel you stand on. Or a fixed bar?
- **Door frame press (sides)**: assumed pressing outward. Or squeezing inward?
- Equipment at home (parallettes, dip bars, Roman chair, Nordic anchor)? Lets the builder hide what I can't do.
- Want weight tracking (for Jefferson curl, weighted pull ups)? Easy to add as an optional `kg` on items and sets.
