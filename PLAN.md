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

Custom exercises made in the app are saved in state next to the built-in ones (ids prefixed `u-`, so they never clash). Every exercise, built-in or custom, can carry my own note and links (videos, tutorials).

Progression ladders (`src/data/progressions.ts`) cover 12 exercises: planche, L / V sit, handstand, crow, dragon flag, hollow body, Nordic, pull up, hang, push up, wall sit, glute bridge. Starter workouts (`src/data/templates.ts`): Iso strength, Push + pull, Core & skills, Legs & posterior chain, Flexibility, Cardio circuit.

## 3. Screens

Tabs: **Today · Workouts · Routines · Catalog · History**

- **Today**: for each followed routine (several can be followed, e.g. isometrics + cardio), its workout for today (weekly) or next (rotation) with Start; rest days show what's next; done today shows a check. Week or rotation strip, quick start for every workout, last workout.
- **Catalog**: sections as groups, search, filters (region, mode, equipment, section), New custom exercise. Exercise page: cue, variations, default dose, progression ladder, my notes & links, my history and best.
- **Workouts**: list + builder, or start from a template. Add exercises from the catalog (picker with the same filters), pick variation, edit dose, reorder (drag on Mac, handle on iPhone), group into superset / circuit blocks, duplicate a workout. Suggestions ("Ready for 50 s", "Ready for Advanced tuck") under items.
- **Routines**: weekly or rotation schedule built from workouts; one routine is followed.
- **Player** (full screen while working out): current item, big countdown for holds, rep counter for reps, rest timer between sets, "next up" preview, skip / back / pause, and logging of what I actually did (reps done, seconds held). Audio beeps (3-2-1, start, end), and the screen stays on (Wake Lock). Summary with RPE, note and "Next time" suggestions.
- **History**: stat tiles, 12-week activity grid, sessions by month; a session's sets, RPE and note; per exercise: best set, last time, heaviest kg, chart of best / total / weight per workout.
- **Sync & backup** (status pill in the top bar / sidebar): connect a GitHub token, sync status, export / import a JSON backup.

## 4. Layout: iPhone and MacBook

- **iPhone (~390 px)**: bottom tab bar, one column, sheets for editing, tap targets ≥ 44 px, safe-area padding for the notch and home bar. Player uses the whole screen with huge numbers readable from the floor.
- **MacBook (≥ 1024 px)**: sidebar nav, two panes (list on the left, detail / builder on the right). In the builder the catalog stays open beside the workout so exercises can be dragged in. Keyboard: space = pause/resume, → = next in the player.
- Light and dark themes from CSS tokens.

## 5. Tech (same stack as piano-path)

- Vite + React 19 + TypeScript, Node 22, plain CSS with tokens in `:root`, hash routing.
- PWA: `manifest.webmanifest`, 180 px apple-touch-icon, service worker (network first for the page, cache first for hashed assets), runs in standalone mode from the Home Screen.
- State: one app state in `localStorage` (`workoutPath.v1`), every change goes through `actions.ts`, `normalize()` keeps old saved copies loading.
- Sync between iPhone and Mac: a private GitHub Gist (`workout-path.json`), same pattern as piano-path. Merge rule: sessions are a union by id minus deleted ids (a delete loses to a later restore or edit); workouts / routines / custom exercises / exercise notes per item by newer `updatedAt`; settings and the followed routine from the newer copy.
- Export / import JSON as a backup.
- Deploy: GitHub Actions → GitHub Pages on push to `main`.
- Timers based on timestamps (not interval counting) so they stay correct when the phone locks or the tab is in the background. Audio starts only after a tap (iOS rule).

### State shape

```ts
{
  customExercises: (Exercise & { updatedAt?, deletedAt? })[],
  exerciseNotes: Record<exerciseId, { note?, links?: { url, label? }[], updatedAt }>,
  workouts: { id, name, blocks: Block[], updatedAt, deletedAt? }[],
  routines: { id, name, kind: "weekly" | "rotation", days?, order?, pos?, updatedAt, deletedAt? }[],
  following: string[],   // followed routine ids (was activeRoutine?: string)
  sessions: { id, workoutId, workoutName?, date, startedAt, endedAt, sets: SetLog[], note?, rpe?, updatedAt? }[],
  sessionsDeleted: { id, at }[],
  settings: { restDefault, beeps, theme, equipment: Equipment[] },
  updatedAt
}
Block   = { id, kind: "straight" | "superset" | "circuit", rounds, restBetween, items: Item[] }
Item    = { id, exerciseId, variationId?, sets, reps?, seconds?, minutes?, kg?, perSide?, rest, skipSuggest? }
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

The workout in progress lives in its own key (`workoutPath.run`, not synced); the sync token in `workoutPath.gist`.

## 7. What's next (from 2026-11-19)

Milestones 1–8 are done and live. Next, in order of value:

9. **Field test on the iPhone and Mac.** Install from Safari (Share → Add to Home Screen), connect sync on both with the same token, run two or three real workouts, and fix what breaks. Check what the browser tests couldn't:
   - beeps with music playing (audio session is now "ambient", so music should keep going; beeps are silent while the silent switch is on);
   - the screen staying on through a long hold and a long rest (Wake Lock in the Home Screen app);
   - leaving mid-workout (lock, switch apps, reload) and resuming;
   - drag to reorder and the reps − / + with sweaty fingers; huge numbers readable from the floor;
   - sync after editing on both devices while one is offline.
10. **Settings screen.** Equipment I have (`settings.equipment` is in state but has no screen yet) with an "only what I have" filter in the catalog and picker; default rest; sounds on / off; theme (system / light / dark, `settings.theme` exists but is unused); first day of the week if the region's is wrong.
11. **Fix and add history by hand.** Edit a saved workout's sets (a wrong rep count or hold), and log a workout done without the player (e.g. at a gym or outdoors).
12. **Progression, part 2.** Edit ladder steps and targets in the app instead of in `progressions.ts`; ladders for custom exercises; weight suggestions for kg items (e.g. +1–2 kg once every set hits the reps), starting with the Jefferson curl.
13. **Tests in the repo.** Move the checks that ran during development (merge rules, template and ladder validation) into `npm test` (Node type stripping, no new dependencies), add engine tests for `buildSteps()` / `catchUp()`, and run them in the deploy workflow before building.
14. **Weekly goal on Today.** A target like "3 workouts a week" with progress on the week strip, and a streak of weeks hit.

### Open questions

- **Ladder targets**: the steps and targets in `src/data/progressions.ts` are my first guess. Which ones should change, and which exercises need a ladder too (e.g. walk press, side plank, Bulgarian split squat with weight)?
- **Week start**: it follows the device's region; is that the day you want (Sunday or Monday)?
- **Suggestion rule**: "two workouts in a row at target" — too fast, too slow?

### Parked

- **Photos per exercise**: every sync re-uploads the whole state to the gist, and photos would make it heavy. If wanted later: small downscaled images in a separate gist file, synced only when they change. Links to photos / videos work today.
- **Apple Health / Watch**: not reachable from a web app.

## 8. Decisions (2026-11-19)

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

## 9. Workouts on the Garmin watch (from 2026-11-20)

I train almost only with the Forerunner 970. The web app stays the place to keep the catalog and build workouts and routines; the watch runs them with **Garmin's own workout player**, and Garmin Connect keeps the record (no history needed here). No watch app of our own (a Connect IQ app was planned first and dropped: much more work, and as far as I know it couldn't fill Connect's sets table).

### How workouts get to Garmin

Garmin's official workout API is only for approved companies. The connect.garmin.com website saves workouts with its own unofficial requests (`/gc-api/workout-service/…`, signed-in cookies + the page's CSRF token), and those only work from that site. So the web app copies a short script with the workouts in it, and I paste it into the browser console on connect.garmin.com on the Mac. Nothing goes through a server of ours and the web app never sees my Garmin password. It can break if Garmin changes its site.

Once a workout is in Connect it's an ordinary Garmin workout: editable in the Connect app, sent to the watch through the phone, and it can be put on the calendar so the watch offers it as today's workout.

The `.fit` file over USB (done) stays as a fallback; those workouts live on the watch only.

### Milestones

G1. **Test (done 2026-11-20; the first paste worked).** "Send to Garmin" in the workout menu copies the script for one workout; it adds a new workout to Connect each time. Check: Garmin accepts it, what the watch shows (Garmin's exercise names, my names and cues in the notes, reps / timed steps, rests, sets), and what Connect saves after doing it.
G2. **Update instead of duplicate (done 2026-11-21).** The script lists my Connect workouts, finds the ones made here (`wp:<id>` in the description) and updates them (`PUT …/workout/<id>`); "Send all workouts" for every workout at once; deleted ones are removed from Connect.
G3. **Routines on the Garmin calendar (done 2026-11-21).** Weekly routines → their workouts scheduled for the next 4 weeks (`POST …/schedule/<workoutId>`), replacing what was scheduled before by this app; rotations → the next workouts on their training days (chosen under the rotation; the order moves on with the calendar). The watch then shows today's workout.
G4. **Smoother sending (bookmark done 2026-11-21, waiting for a real click).** A bookmark ("Workout Path → Garmin") reads the copied data from the clipboard; the console stays as the fallback. Later: remember what was sent and show "changed since last send".
G5. **Tidy the web app for watch training.** Hide History and the phone player behind a setting, if I still don't use them.

### Open questions

1. **Rotations on the calendar** (decided: training days per rotation; a missed day isn't caught up, the calendar just moves on).
2. **Edits in Connect.** A send overwrites workouts made here, so edits made in Connect are lost. Fine to always edit in the web app?
3. **Exercise names.** The watch shows Garmin's name for each exercise (`src/data/garminCodes.ts` picks the closest; some are generic, like "Total Body" for the planche). Is that readable enough with my name in the step's note?
