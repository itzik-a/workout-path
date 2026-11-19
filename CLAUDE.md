# Workout Path

A personal workout web app (React, built with Vite, hosted on GitHub Pages), used on a MacBook and an iPhone (installed to the Home Screen). See `PLAN.md` for the concepts, screens and milestones.

## Data

- `src/data/catalog.ts`: `SECTIONS` and `EXERCISES` (the built-in catalog). Sections group by type of training; `regions` (upper / lower / core / full) is the body-region filter.
- **Never rename or reuse an exercise or variation `id`**: workouts, routines and sessions are keyed by id. Add new ids instead. Custom exercises made in the app use ids prefixed `u-`.
- Modes: `reps` (count), `hold` (seconds), `time` (minutes). A variation can override the exercise's mode and dose. `perSide` means the dose is per side.

## Rules for changes

- Design mobile-first (iPhone ~390 px), tap targets at least 44 px, safe-area padding. Below 768 px: bottom tab bar. From 1024 px: sidebar + two panes. Check both.
- Colours only from the CSS tokens in `:root`; light and dark themes must both stay readable.
- Audio starts only from a user tap (iOS). Timers use timestamps so they survive the screen locking.
- New state fields must be optional in `normalize()` so older saved copies still load.
- Run `npm run build` after edits; it must pass with no type errors.
