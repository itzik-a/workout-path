import { useState } from "react";
import type { Exercise } from "../data/catalog";
import { saveFile } from "../lib/backup";
import { fitFileName, workoutFit } from "../lib/garmin";
import { connectScript } from "../lib/garminConnect";
import type { Workout } from "../state/store";
import { IconExternal } from "./Icons";

const CONNECT_URL = "https://connect.garmin.com/modern/workouts";
const OPENMTP_URL = "https://openmtp.ganeshrvel.com";

/** Send a workout to Garmin: into Garmin Connect's Workouts list (a script pasted on
    connect.garmin.com), or as a workout file copied to the watch over USB. */
export function GarminSheet({ workout, custom, onClose }: { workout: Workout; custom: Exercise[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [usb, setUsb] = useState(false);
  const touch = window.matchMedia("(pointer: coarse)").matches;

  async function copy() {
    try {
      await navigator.clipboard.writeText(connectScript([workout], custom));
      setCopied(true);
    } catch {
      setCopied(false);
      alert("Couldn't copy. Try again from the Mac.");
    }
  }

  async function save() {
    const name = fitFileName(workout);
    const res = await saveFile(new File([workoutFit(workout, custom) as BlobPart], name, { type: "application/octet-stream" }));
    if (res !== "cancelled") setSaved(name);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card garmin-sheet" role="dialog" aria-modal="true" aria-labelledby="garmin-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="garmin-title">Send to Garmin</h2>
        <p className="muted small">
          Adds “{workout.name || "Workout"}” to your Workouts in Garmin Connect, so the watch runs it with its own
          workout player (vibration, rep counting, heart rate) and Connect saves the sets.
          {touch && " This needs a browser on the Mac."}
        </p>
        <ol className="steps">
          <li>
            <b>Copy it{copied ? ": done" : ""}</b>
            <span className="muted small">A short script with the workout in it.</span>
          </li>
          <li>
            <b>Open Garmin Connect on the Mac, signed in</b>
            <a className="link" href={CONNECT_URL} target="_blank" rel="noopener noreferrer">connect.garmin.com <IconExternal /></a>
          </li>
          <li>
            <b>Paste it into the browser console and press Return</b>
            <span className="muted small">
              Chrome: ⌥⌘J. The first time it asks you to type <code>allow pasting</code>. Safari: turn on “Show features for
              web developers” in Settings › Advanced, then ⌥⌘C. It only talks to Garmin, from that page.
            </span>
          </li>
          <li>
            <b>Send it to the watch</b>
            <span className="muted small">The workout opens in Connect: choose Send to Device (or schedule it on the calendar). On the watch: Strength › Workouts.</span>
          </li>
        </ol>
        <button type="button" className="btn primary" onClick={() => void copy()}>{copied ? "Copy again" : "Copy for Garmin Connect"}</button>
        <p className="muted small">Each paste adds a new copy; delete old ones in Connect for now.</p>

        {!usb ? (
          <button type="button" className="btn ghost" onClick={() => setUsb(true)}>Or copy a file to the watch over USB</button>
        ) : (
          <div className="garmin-usb">
            <h3>Workout file over USB</h3>
            <ol className="steps">
              <li>
                <b>Save the file{saved ? ": done" : ""}</b>
                <span className="muted small">{saved ? <>Saved as <code>{saved}</code>.</> : <>A <code>.fit</code> workout file.</>}</span>
              </li>
              <li>
                <b>Plug the watch into the Mac and open it with OpenMTP</b>
                <a className="link" href={OPENMTP_URL} target="_blank" rel="noopener noreferrer">Get OpenMTP (free) <IconExternal /></a>
              </li>
              <li>
                <b>Copy the file to GARMIN › NewFiles, then unplug</b>
                <span className="muted small">It stays on the watch only; it doesn't show in Garmin Connect.</span>
              </li>
            </ol>
            <button type="button" className="btn" onClick={() => void save()}>{saved ? "Save again" : "Save Garmin file"}</button>
          </div>
        )}
        <button type="button" className="btn ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
