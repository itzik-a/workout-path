/* "Sync & backup": connect this device to the gist, see status, export / import a backup file. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { exportBackup, importBackup, readBackup } from "../lib/backup";
import { getState } from "../state/store";
import { TOKEN_URL, connect, disconnect, syncNow, useSyncStatus, type SyncStatus } from "../state/sync";
import { IconExternal } from "./Icons";
import { ThemePicker } from "./ThemePicker";

function ago(t?: number) {
  if (!t) return "not yet";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** The address the Garmin watch app downloads from: pasted once into its settings in the Connect IQ phone app. */
function WatchAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select it by hand */ }
  };
  return (
    <div className="watch-address">
      <span className="muted small">Watch app address (Connect IQ app on the phone → Workout Path → Settings):</span>
      <code className="small">{url}</code>
      <button type="button" className="btn ghost" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

const dotClass = (s: SyncStatus) => (s.kind === "ok" ? "ok" : s.kind === "busy" ? "busy" : s.kind === "pending" ? "pending" : s.kind === "error" ? "err" : "");

export function SyncPill({ onOpen }: { onOpen: () => void }) {
  const s = useSyncStatus();
  return (
    <button type="button" className="sync" onClick={onOpen} aria-label={`Sync: ${s.text}. Open sync and backup`}>
      <span className={`dot ${dotClass(s)}`} />
      <span role="status">{s.text}</span>
    </button>
  );
}

export function DataSheet({ onClose }: { onClose: () => void }) {
  const s = useSyncStatus();
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
    const iv = setInterval(() => tick((n) => n + 1), 10_000); // keep "x min ago" fresh
    return () => clearInterval(iv);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true); setErr("");
    try { await connect(token); setToken(""); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  async function onFile(f?: File) {
    if (!f) return;
    try {
      const b = await readBackup(f);
      const when = b.exportedAt ? new Date(b.exportedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "an unknown date";
      if (!window.confirm(`Merge the backup from ${when} into this device?\n\n${b.workouts} workouts, ${b.routines} routines, ${b.sessions} saved sessions.\nNothing here is removed; for anything in both, the newer edit is kept.`)) return;
      const before = getState();
      const count = (st: typeof before) => ({ w: st.workouts.filter((w) => !w.deletedAt).length, s: st.sessions.length, r: st.routines.filter((r) => !r.deletedAt).length });
      const a = count(before);
      importBackup(b);
      const c = count(getState());
      const added = [
        c.w - a.w && `${c.w - a.w} ${c.w - a.w === 1 ? "workout" : "workouts"}`,
        c.r - a.r && `${c.r - a.r} ${c.r - a.r === 1 ? "routine" : "routines"}`,
        c.s - a.s && `${c.s - a.s} saved ${c.s - a.s === 1 ? "session" : "sessions"}`,
      ].filter(Boolean);
      setNote(added.length ? `Backup merged: ${added.join(", ")} added.` : "Backup merged. Everything in it was already here.");
    } catch (x) {
      setNote((x as Error).message);
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  const connected = s.kind !== "off";

  return (
    <dialog ref={ref} className="dlg" aria-labelledby="dlg-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      <div className="dlg-body">
        <div className="dlg-grip" aria-hidden="true" />
        <div className="card-head">
          <h2 id="dlg-title">Sync &amp; backup</h2>
          <button type="button" className="btn ghost sm" onClick={() => ref.current?.close()}>Done</button>
        </div>

        <section className="dlg-section" aria-labelledby="sync-title">
          <h3 id="sync-title">Sync across devices</h3>
          {connected ? (
            <>
              <div className="sync-state">
                <span className={`dot ${dotClass(s)}`} />
                <div>
                  <b>{s.text}</b>
                  <span className="muted small">Last synced {ago(s.last)}</span>
                </div>
              </div>
              {s.detail && (s.kind === "error" || s.kind === "offline") && <p className="small">{s.detail}</p>}
              {s.quota && (
                <p className="muted small">
                  GitHub requests left this hour: {s.quota.remaining.toLocaleString()} of {s.quota.limit.toLocaleString()}
                  {" "}(resets {new Date(s.quota.reset).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })})
                </p>
              )}
              {s.watchUrl && <WatchAddress url={s.watchUrl} />}
              <p className="muted small">
                Workouts, routines and history are saved to a private gist on your GitHub account. It syncs when you open the app,
                after you make changes (at most once a minute while you edit, right away when you leave the app), and whenever you come back to it. A workout in progress stays on this device.
              </p>
              <div className="dlg-actions">
                <button type="button" className="btn primary" disabled={s.kind === "busy"} onClick={() => void syncNow(true)}>Sync now</button>
                {s.gistId && (
                  <a className="btn ghost" href={`https://gist.github.com/${s.gistId}`} target="_blank" rel="noopener">View the gist <IconExternal /></a>
                )}
                <button type="button" className="btn ghost danger" onClick={() => { if (window.confirm("Stop syncing on this device? Everything stays here and in the gist.")) disconnect(); }}>
                  Disconnect this device
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted small">
                Everything is saved only on this device for now. Connect each device once with the same GitHub token to keep
                your iPhone and Mac in step through a private gist.
              </p>
              <ol className="steps">
                <li>
                  <b>Create a token on GitHub</b>
                  <span className="muted small">
                    The link opens the form with only the <code>gist</code> permission ticked. Choose an expiration, press
                    <i> Generate token</i>, and copy it. The token you made for Piano Path works too. Use the same token on every device.
                  </span>
                  <a className="link" href={TOKEN_URL} target="_blank" rel="noopener">Open GitHub token page <IconExternal /></a>
                </li>
                <li>
                  <b>Paste it here</b>
                  <form className="token-form" onSubmit={submit}>
                    <input
                      type="password" autoComplete="off" autoCapitalize="off" spellCheck={false}
                      placeholder="ghp_…" aria-label="GitHub token" value={token} onChange={(e) => setToken(e.target.value)}
                    />
                    <button className="btn primary" type="submit" disabled={busy || !token.trim()}>{busy ? "Connecting…" : "Connect"}</button>
                  </form>
                  {err && <p className="form-error" role="alert">{err}</p>}
                </li>
              </ol>
              <p className="muted small">The token stays on this device and can do nothing except read and write your gists.</p>
            </>
          )}
        </section>

        <section className="dlg-section" aria-labelledby="backup-title">
          <h3 id="backup-title">Backup file</h3>
          <p className="muted small">A JSON file with all your workouts, routines and history. Importing merges it into this device; nothing here is removed.</p>
          <div className="dlg-actions row">
            <button type="button" className="btn" onClick={() => void exportBackup().then((r) => setNote(r === "downloaded" ? "Backup downloaded to your Downloads folder." : r === "shared" ? "Backup shared." : ""))}>Export backup</button>
            <button type="button" className="btn ghost" onClick={() => file.current?.click()}>Import backup…</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
          {note && <p className="small" role="status">{note}</p>}
        </section>
        <section className="dlg-section" aria-labelledby="theme-title">
          <h3 id="theme-title">Appearance</h3>
          <ThemePicker />
          <p className="muted small">System follows this device's light or dark setting. Each device keeps its own choice.</p>
        </section>
      </div>
    </dialog>
  );
}
