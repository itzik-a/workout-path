import { useState } from "react";
import type { Exercise } from "../data/catalog";
import { saveFile } from "../lib/backup";
import { fitFileName, garminSteps, workoutFit } from "../lib/garmin";
import type { Workout } from "../state/store";
import { IconExternal } from "./Icons";

const OPENMTP_URL = "https://openmtp.ganeshrvel.com";

/** Save a workout as a Garmin workout file, with how to get it onto the watch. */
export function GarminSheet({ workout, custom, onClose }: { workout: Workout; custom: Exercise[]; onClose: () => void }) {
  const [saved, setSaved] = useState<string | null>(null);
  const steps = garminSteps(workout, custom).length;
  const touch = window.matchMedia("(pointer: coarse)").matches;

  async function save() {
    const name = fitFileName(workout);
    const bytes = workoutFit(workout, custom);
    const res = await saveFile(new File([bytes as BlobPart], name, { type: "application/octet-stream" }));
    if (res !== "cancelled") setSaved(name);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card garmin-sheet" role="dialog" aria-modal="true" aria-labelledby="garmin-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="garmin-title">Send to a Garmin watch</h2>
        <p className="muted small">
          The watch runs the workout on its own, with vibration and beeps on your wrist and heart rate, and saves it to
          Garmin Connect (not to this app's history). {steps} steps.
        </p>
        <ol className="steps">
          <li>
            <b>Save the file{saved ? ": done" : ""}</b>
            <span className="muted small">{saved ? <>Saved as <code>{saved}</code>.</> : <>A <code>.fit</code> workout file.</>}{touch && " Copying it to the watch needs a computer, so this is easiest on the Mac."}</span>
          </li>
          <li>
            <b>Plug the watch into the Mac</b>
            <span className="muted small">With its USB cable. Finder doesn't show Garmin watches, so open it with OpenMTP (free).</span>
            <a className="link" href={OPENMTP_URL} target="_blank" rel="noopener noreferrer">Get OpenMTP <IconExternal /></a>
          </li>
          <li>
            <b>Copy the file to GARMIN › NewFiles</b>
            <span className="muted small">Then unplug the watch. It moves the file into its workouts by itself.</span>
          </li>
          <li>
            <b>Start it on the watch</b>
            <span className="muted small">Press Start, pick Strength, hold Menu, then Training › Workouts. A reps step waits for the lap button; timed steps and rests move on by themselves.</span>
          </li>
        </ol>
        <button type="button" className="btn primary" onClick={() => void save()}>{saved ? "Save again" : "Save Garmin file"}</button>
        <button type="button" className="btn ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
