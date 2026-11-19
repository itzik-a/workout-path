# Workout Path

A personal workout web app (React, built with Vite, hosted on GitHub Pages), used on a MacBook and an iPhone (installed to the Home Screen). See `PLAN.md` for the concepts, screens and milestones.

## How the site is built

Vite + React 19 + TypeScript. Node 22 (`.nvmrc`). On this Mac `npm start` runs `nvm use` and then the dev server; `npm run dev` alone runs the local server (also reachable from the iPhone on the same Wi-Fi); `npm run build` typechecks and builds into `dist/`.

- Routing is the URL hash: `#today`, `#workouts`, `#workouts/<id>`, `#routines`, `#routines/<id>`, `#catalog`, `#catalog/<exercise id>`, `#history`, `#play/<workout id>` (`readHash()` in `src/App.tsx`).
- `src/views/`: `Catalog` (list + detail panes), `ExerciseDetail`, `Workouts` (list; `#workouts/<id>` opens `Builder`), `Builder`, `Player`, `Routines` (list; `#routines/<id>` opens the editor), `Today`, `Placeholder` (History until milestone 6). `src/components/`: icons, `ExerciseBrowser` (search + filters + grouped list, shared by the Catalog and the builder's picker), `Toast`, and `ui.tsx` (`ChipGroup`, `Seg`, `Stepper`, `NumberInput`, `Menu`, `Select`, `useSessionState`, `useMedia`).
- Workouts: a workout is a list of blocks. A `straight` block holds exactly one exercise (its own sets and rest). A `superset` / `circuit` block holds 2+ exercises done one set each per round; the block's `rounds` and `restBetween` apply, item `sets` is ignored and item `rest` is the rest after that exercise. `tidy()` in `src/lib/workout.ts` keeps this true after every edit (a group of one becomes a single exercise). Grouping uses the max of the sets as rounds; ungrouping gives each exercise the rounds as sets.
- Deleting a workout sets `deletedAt` (it stays in state, hidden), so history keeps its name and the delete can sync. `liveWorkouts()` lists the rest. Destructive builder actions show an Undo toast (`showToast` in `src/lib/toast.ts`) that restores a snapshot of the workout.
- Builder: tap a row to edit it (one open at a time). Reorder by dragging the grip handle (`src/lib/useDragSort.ts`, pointer events, works with touch and mouse, auto-scrolls) or with Move up / down in the row menu. The picker is a full-screen sheet below 1024 px and a side pane from 1024 px, where exercises can also be dragged into the workout (HTML5 drag type `application/x-workout-exercise`; drop on a group to join it). Changing an item's variation resets its dose to that variation's default.
- `src/lib/filter.ts`: catalog search + filters (OR within a group, AND across groups; search words must all match name, aliases, variations, section or equipment). The mode filter also matches variations that override the mode. Filters live in `sessionStorage` (`workoutPath.catalogFilters`), not in app state.
- `src/lib/format.ts`: `formatDose()` ("3 × 45 s", "10 reps", "20 min", "per side", "· 12 kg").
- `src/state/store.ts`: the single app state (shape in `PLAN.md`), `useAppState()`, `update(fn)`; saved to `localStorage` key `workoutPath.v1`. `src/state/actions.ts`: every state change goes through here. Ids come from `uid()` (`crypto.randomUUID` is missing on the plain-http LAN dev server).
- Layout: below 768 px a top bar + bottom tab bar (5 tabs) and one pane (list or detail); from 768 px a sidebar; from 1024 px the catalog is two panes that scroll on their own. Catalog keyboard on the Mac: `/` search, ↑ ↓ move, Esc close.
- Player (`#play/<workout id>`, `src/views/Player.tsx`, full screen without the tab bar / sidebar): `startWorkout()` (call from a tap) flattens the workout into steps (`buildSteps()` in `src/lib/player.ts`: work steps per set / round / side, rest steps between; per-side timed sets get a 5 s "Switch sides" rest; no trailing rest). The run (`Run`) is kept in `localStorage` key `workoutPath.run` (`src/state/run.ts`, not synced) so a reload or the app being closed resumes it; a Resume bar shows on every tab while one exists.
  - Timers are timestamps (`endsAt`, `left` while paused, `lead` = 3-2-1 get-ready). `catchUp()` applies every timer that ended, each at its own end time, so time away is replayed correctly. A rest always starts by itself; a timed set starts by itself after a rest (no lead) or straight after another set (5 s lead), otherwise on Start (3 s lead). Reps sets: count with − / +, then Done.
  - Logging: a timed set that runs out logs its target; End set logs what was done (0 = skipped); Skip logs skipped; Back goes to the previous set to redo it (its log is overwritten). Ending early → summary with Keep going. Save adds a `Session` (with `workoutName`) and clears the run.
  - Sound (`src/lib/audio.ts`): ticks at 3-2-1, a go tone when work starts, a done tone when a timed set ends; unlocked by the first tap (iOS), muted by the speaker button (`settings.beeps`). No sounds while catching up after time away. Screen stays on via Wake Lock (`src/lib/wakeLock.ts`), re-taken on return to the page. Mac keys: Space = main button, → skip, ← back.
- Routines (`src/lib/routine.ts`, actions in `actions.ts`): one is followed at a time (`activeRoutine`). Weekly: `days[0..6]`, 0 = Monday, null = rest day; shown in the device region's week order (`weekStart()` via `Intl.Locale` week info, Monday if unknown). Rotation: `order` (workout ids, repeats allowed) and `pos` (index of the next one). Saving a session moves `pos` on when it's the active rotation's next workout and at least one set was done (`addSession`); "Skip to next" and "Make this next" set it by hand; reordering keeps the marker on the same workout. Deleted workouts are skipped (rotation) or count as rest (weekly). Deleting a routine sets `deletedAt` (Undo restores it and whether it was followed).
- Today (`src/views/Today.tsx`, `todayPlan()`): the followed routine's workout for today (weekly) or next (rotation) with Start; a rest day shows the next scheduled day; done today shows a check and what's next. Weekly gets a week strip (done / today / missed), rotation a sequence strip. Then Quick start (every workout) and the last workout. No routine → set one up (or build a first workout).
- The exercise page's "My history" shows best reps / hold / minutes / kg and the last session's sets (`groupSets()` / `setsLine()` from `Player.tsx`).
- PWA: `public/manifest.webmanifest`, `public/icon.svg`, PNG icons in `public/icons/` (180 px is the iOS apple-touch-icon; the PNGs are full-bleed with the kettlebell inside the maskable safe zone), `public/sw.js` (production only; network first for the page, cache first for hashed assets).
- Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main` (Pages source = GitHub Actions). Live at https://itzik-a.github.io/workout-path/.

## Data

- `src/data/catalog.ts`: `SECTIONS` and `EXERCISES` (the built-in catalog), label maps (`REGION_LABEL`, `MODE_LABEL`, `EQUIPMENT_LABEL`) and `HOME_EQUIPMENT` (what I have; default for `settings.equipment`). Sections group by type of training; `regions` (upper / lower / core / full) is the body-region filter.
- **Never rename or reuse an exercise or variation `id`**: workouts, routines and sessions are keyed by id. Add new ids instead. Custom exercises made in the app use ids prefixed `u-`.
- Modes: `reps` (count), `hold` (seconds), `time` (minutes). A variation can override the exercise's mode and dose. `perSide` means the dose is per side.

## Rules for changes

- Design mobile-first (iPhone ~390 px), tap targets at least 44 px, safe-area padding. Below 768 px: bottom tab bar. From 1024 px: sidebar + two panes. Check both.
- Colours only from the CSS tokens in `:root`; light and dark themes must both stay readable.
- Audio starts only from a user tap (iOS). Timers use timestamps so they survive the screen locking.
- New state fields must be optional in `normalize()` so older saved copies still load.
- Run `npm run build` after edits; it must pass with no type errors.
