/* Beeps with Web Audio. iOS only lets audio start from a tap, so call unlockAudio()
   inside a tap handler (Start workout, any tap in the player). */
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    // A silent buffer played inside the tap fully unlocks output on iOS.
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, 22050);
    b.connect(ctx.destination);
    b.start(0);
  } catch { /* no audio */ }
}

function tone(freq: number, dur: number, when = 0, gain = 0.28) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export const sound = {
  /** 3, 2, 1 */
  tick: () => tone(880, 0.12),
  /** go: work starts */
  go: () => tone(1320, 0.4, 0, 0.32),
  /** a timed set is over */
  done: () => { tone(988, 0.14); tone(1319, 0.32, 0.15); },
};
