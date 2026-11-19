/* Keep the screen on during a workout. The lock drops when the page is hidden,
   so it's taken again on return. Needs a tap the first time on iOS. */
let sentinel: WakeLockSentinel | null = null;
let want = false;

export async function keepAwake(on: boolean) {
  want = on;
  if (!on) {
    const s = sentinel;
    sentinel = null;
    try { await s?.release(); } catch { /* already released */ }
    return;
  }
  if (sentinel || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => { sentinel = null; });
  } catch { /* not allowed right now */ }
}

document.addEventListener("visibilitychange", () => {
  if (want && document.visibilityState === "visible") void keepAwake(true);
});
