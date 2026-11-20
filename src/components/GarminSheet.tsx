import { useMemo, useState } from "react";
import { saveFile } from "../lib/backup";
import { fitFileName, workoutFit } from "../lib/garmin";
import { garminPayload } from "../lib/garminConnect";
import { garminBookmarklet, garminScript } from "../lib/garminRunner";
import { setGarminAnchors } from "../state/actions";
import { useAppState, type Workout } from "../state/store";
import { IconExternal } from "./Icons";

const CONNECT_URL = "https://connect.garmin.com/modern/workouts";
const OPENMTP_URL = "https://openmtp.ganeshrvel.com";

const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** Send to Garmin Connect: one workout, or every workout plus the calendar from my followed
    routines. Copies the data; on connect.garmin.com the bookmark (or the console) sends it. */
export function GarminSheet({ which, onClose }: { which: Workout | "all"; onClose: () => void }) {
  const s = useAppState();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const { payload, plan } = useMemo(() => garminPayload(s, which), [s, which]);
  const one = which !== "all" ? which : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(garminScript(payload));
      if (plan) setGarminAnchors(plan.anchors);
      setCopied(true);
    } catch {
      alert("Couldn't copy. Try again from the Mac.");
    }
  }

  async function save() {
    if (!one) return;
    const name = fitFileName(one);
    const res = await saveFile(new File([workoutFit(one, s.customExercises) as BlobPart], name, { type: "application/octet-stream" }));
    if (res !== "cancelled") setSaved(name);
  }

  const n = payload.workouts.length;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card garmin-sheet" role="dialog" aria-modal="true" aria-labelledby="garmin-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="garmin-title">{one ? "Send to Garmin" : "Send everything to Garmin"}</h2>
        {one ? (
          <p className="muted small">“{one.name || "Workout"}” goes to your Workouts in Garmin Connect; if it was sent before, that one is updated.</p>
        ) : (
          <div className="garmin-summary small">
            <p><b>{n} {n === 1 ? "workout" : "workouts"}</b> to your Workouts in Garmin Connect. Ones sent before are updated; ones deleted here are removed there.</p>
            {plan && (plan.days.length ? (
              <p><b>{plan.days.length} on the calendar</b>, {fmtDate(plan.from)} – {fmtDate(plan.to)}, from your followed routines. The watch offers the day's workout.</p>
            ) : (
              <p className="muted">Nothing for the calendar: follow a weekly routine, or give a rotation its training days.</p>
            ))}
            {plan?.skipped.map((r) => (
              <p key={r.id} className="muted">“{r.name}” is a rotation without training days, so it's left off the calendar. <a href={`#routines/${r.id}`} onClick={onClose}>Set its days</a></p>
            ))}
          </div>
        )}
        {touch && <p className="muted small">The sending happens in a browser on the Mac.</p>}

        <ol className="steps">
          <li>
            <b>Copy it{copied ? ": done" : ""}</b>
          </li>
          <li>
            <b>On Garmin Connect, click the Workout Path bookmark</b>
            <span className="muted small">Signed in, any page. The first time, Chrome asks to see the clipboard: allow it.</span>
            <a className="link" href={CONNECT_URL} target="_blank" rel="noopener noreferrer">connect.garmin.com <IconExternal /></a>
          </li>
        </ol>
        <button type="button" className="btn primary" onClick={() => void copy()}>{copied ? "Copy again" : "Copy for Garmin"}</button>

        <details className="garmin-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
          <summary>The bookmark, and other ways</summary>
          <div className="garmin-more-body">
            <p className="small">
              <b>Set up the bookmark once:</b> drag this to the bookmarks bar (⇧⌘B shows it). When the app changes, it may ask you to drag it again.
            </p>
            <a
              className="btn bookmarklet"
              ref={(el) => { el?.setAttribute("href", garminBookmarklet()); }}
              onClick={(e) => { e.preventDefault(); alert("Drag this button to the bookmarks bar, then click it on connect.garmin.com."); }}
            >
              Workout Path → Garmin
            </a>
            <p className="small">
              <b>No bookmark?</b> Paste what you copied into the browser console on connect.garmin.com and press Return
              (Chrome: ⌥⌘J; Safari: ⌥⌘C after turning on “Show features for web developers” in Settings › Advanced).
            </p>
            {one && (
              <>
                <p className="small"><b>Or a workout file over USB</b> (stays on the watch only): save it, open the watch with <a href={OPENMTP_URL} target="_blank" rel="noopener noreferrer">OpenMTP</a>, and copy it to GARMIN › NewFiles.</p>
                <button type="button" className="btn" onClick={() => void save()}>{saved ? `Saved ${saved}` : "Save Garmin file"}</button>
              </>
            )}
          </div>
        </details>
        <button type="button" className="btn ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
