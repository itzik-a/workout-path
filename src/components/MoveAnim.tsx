/* Small looping SVG animations of how a movement looks (side / front views, flat shapes).
   Orange (accent) marks the palm side of the hand. Each moving part rotates about its own
   joint; the timing shows the tempo (e.g. up fast, down slowly). Styles: `.mv` in styles.css. */
import type { CSSProperties, ReactNode } from "react";
import type { Exercise } from "../data/catalog";

export type MoveId =
  | "wrist-curl" | "wrist-ext"
  | "radial" | "ulnar"
  | "pronation" | "supination"
  | "finger-band" | "finger-hold"
  | "ball-squeeze";

/** "exercise" or "exercise:variation" → animation. A variation key wins over the exercise key. */
const MOVES: Record<string, MoveId> = {
  "wrist-curl-eccentric": "wrist-curl",
  "wrist-extension-curl": "wrist-ext",
  "wrist-deviation:radial": "radial",
  "wrist-deviation:ulnar": "ulnar",
  "forearm-rotation:pronation": "pronation",
  "forearm-rotation:supination": "supination",
  "finger-extension:band": "finger-band",
  "finger-extension:hand-hold": "finger-hold",
  "grip-squeeze:ball-reps": "ball-squeeze",
};

/** Short tempo / setup line shown under the drawing on the exercise page. */
const HINT: Record<MoveId, string> = {
  "wrist-curl": "Palm up · curl up ~1 s · lower slowly ~3 s",
  "wrist-ext": "Palm down · lift the back of the hand ~1 s · lower ~3 s",
  radial: "Thumb forward · tilt up toward the thumb · lower slowly",
  ulnar: "Thumb forward · tilt back toward the little finger · lower slowly",
  pronation: "Elbow at 90° · turn the palm down ~2 s · back ~2 s",
  supination: "Elbow at 90° · turn the palm up ~2 s · back ~2 s",
  "finger-band": "Open as wide as you can ~1 s · close slowly ~2 s",
  "finger-hold": "Push the fingers up into the other hand · no movement",
  "ball-squeeze": "Squeeze hard 2–3 s · let go slowly",
};

export const moveFor = (exerciseId: string, variationId?: string): MoveId | undefined =>
  (variationId && MOVES[`${exerciseId}:${variationId}`]) || MOVES[exerciseId];

/** Every distinct animation of an exercise (one per variation that has its own), for the exercise page. */
export function movesOf(ex: Exercise): { id: MoveId; label: string; hint: string }[] {
  const out: { id: MoveId; label: string; hint: string }[] = [];
  const add = (id: MoveId | undefined, label: string) => { if (id && !out.some((m) => m.id === id)) out.push({ id, label, hint: HINT[id] }); };
  if (ex.variations?.length) for (const v of ex.variations) add(moveFor(ex.id, v.id), MOVES[`${ex.id}:${v.id}`] ? v.name : ex.name);
  else add(moveFor(ex.id), ex.name);
  return out;
}

const LABEL: Record<MoveId, string> = {
  "wrist-curl": "Wrist curl: forearm resting on the thigh, palm up; the hand curls up, then lowers slowly",
  "wrist-ext": "Wrist extension: forearm resting on the thigh, palm down; the back of the hand lifts up, then lowers slowly",
  radial: "Radial deviation: arm hanging by your side, thumb forward, holding a hammer by the end; the hammer tilts up toward the thumb, then lowers",
  ulnar: "Ulnar deviation: arm hanging by your side, thumb forward, hammer pointing back; the hammer lifts back toward the little finger, then lowers",
  pronation: "Pronation: elbow bent at your side, forearm pointing forward, hammer up; the palm turns down, then back",
  supination: "Supination: elbow bent at your side, forearm pointing forward, hammer up; the palm turns up, then back",
  "finger-band": "Finger extension with a band around the fingertips: the fingers spread wide, then close slowly",
  "finger-hold": "Finger extension hold: hand flat, the other hand presses on the backs of the fingers; push up into it without moving",
  "ball-squeeze": "Ball squeeze: the hand squeezes a ball hard, holds, then lets go slowly",
};

const Arrow = ({ d, head }: { d: string; head: string }) => (
  <><path className="mv-arrow" d={d} /><path className="mv-arrow-head" d={head} /></>
);
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <text className="mv-label" x={x} y={y}>{children}</text>;
/** A part that rotates about (x, y) in viewBox units with the given animation class. */
const Joint = ({ x, y, anim, style, children }: { x: number; y: number; anim: string; style?: CSSProperties; children: ReactNode }) => (
  <g className={`mv-joint ${anim}`} style={{ transformOrigin: `${x}px ${y}px`, ...style }}>{children}</g>
);

/** Forearm resting on the thigh, hand at the wrist (150, 72); palm stripe on top (up) or below (down). */
function Curl({ palm }: { palm: "up" | "down" }) {
  return (
    <>
      <rect className="mv-ground" x="6" y="84" width="150" height="36" rx="18" />
      <T x={14} y={138}>THIGH</T>
      <rect className="mv-limb" x="18" y="61" width="134" height="22" rx="11" />
      <T x={34} y={54}>{palm === "up" ? "FOREARM, PALM UP" : "FOREARM, PALM DOWN"}</T>
      <Joint x={150} y={72} anim="mv-curl">
        <rect className="mv-limb" x="144" y="64" width="62" height="16" rx="8" />
        <rect className="mv-palm" x="152" y={palm === "up" ? 64 : 76} width="50" height="4" rx="2" />
        <rect className="mv-prop" x="186" y="50" width="10" height="44" rx="3" />
      </Joint>
      <Arrow d="M 216 94 A 62 62 0 0 0 208 36" head="M 202 36 L 210 30 L 213 40 Z" />
    </>
  );
}

/** Arm hanging by the side, thumb forward (right); a hammer held by the end points forward or back. */
function Deviation({ dir }: { dir: "radial" | "ulnar" }) {
  const fwd = dir === "radial";
  return (
    <>
      <rect className="mv-limb" x="89" y="4" width="22" height="88" rx="11" />
      <T x={fwd ? 16 : 150} y={40}>ARM BY</T>
      <T x={fwd ? 16 : 150} y={54}>YOUR SIDE</T>
      <T x={170} y={146}>FRONT →</T>
      <Joint x={100} y={92} anim={fwd ? "mv-radial" : "mv-ulnar"}>
        {fwd
          ? <><line className="mv-prop-line" x1="100" y1="104" x2="170" y2="104" /><rect className="mv-prop" x="164" y="88" width="14" height="32" rx="3" /></>
          : <><line className="mv-prop-line" x1="100" y1="104" x2="30" y2="104" /><rect className="mv-prop" x="22" y="88" width="14" height="32" rx="3" /></>}
        <rect className="mv-limb" x="88" y="88" width="24" height="28" rx="10" />
        <rect className="mv-limb" x="107" y="87" width="9" height="15" rx="4.5" />
      </Joint>
      {fwd
        ? <Arrow d="M 192 126 A 92 92 0 0 0 192 70" head="M 186 72 L 193 64 L 198 74 Z" />
        : <Arrow d="M 8 126 A 92 92 0 0 1 8 70" head="M 2 74 L 7 64 L 14 72 Z" />}
    </>
  );
}

/** Seen from the front, forearm pointing at you, hammer up; turns toward palm down (left) or up (right). */
function Rotation({ dir }: { dir: "pronation" | "supination" }) {
  return (
    <>
      <path className="mv-guide" d="M 50 104 A 70 70 0 0 1 190 104" />
      <T x={10} y={100}>PALM</T>
      <T x={10} y={113}>DOWN</T>
      <T x={198} y={100}>PALM</T>
      <T x={198} y={113}>UP</T>
      <T x={62} y={146}>FOREARM POINTS AT YOU</T>
      <Joint x={120} y={104} anim={dir === "pronation" ? "mv-pronate" : "mv-supinate"}>
        <line className="mv-prop-line" x1="120" y1="104" x2="120" y2="30" />
        <rect className="mv-prop" x="104" y="22" width="32" height="14" rx="3" />
        <circle className="mv-limb" cx="120" cy="104" r="22" />
        <path className="mv-palm" d="M 98 98 A 22 22 0 0 0 98 110 L 102 110 A 18 18 0 0 1 102 98 Z" />
      </Joint>
    </>
  );
}

/** Front view of the hand, palm toward you, fingers up. */
function Hand({ band }: { band: boolean }) {
  const fingers = [
    { c: 100, open: -24, closed: 5 },
    { c: 114, open: -8, closed: 2 },
    { c: 128, open: 8, closed: -2 },
    { c: 142, open: 24, closed: -5 },
  ];
  return (
    <>
      {fingers.map((f) => (
        <Joint key={f.c} x={f.c} y={92} anim="mv-finger" style={{ "--open": `${f.open}deg`, "--closed": `${f.closed}deg` } as CSSProperties}>
          <rect className="mv-limb" x={f.c - 6} y="46" width="12" height="50" rx="6" />
        </Joint>
      ))}
      <Joint x={96} y={116} anim="mv-finger" style={{ "--open": "-58deg", "--closed": "-22deg" } as CSSProperties}>
        <rect className="mv-limb" x="90" y="80" width="12" height="40" rx="6" />
      </Joint>
      <rect className="mv-limb" x="90" y="86" width="62" height="52" rx="16" />
      {band && <ellipse className="mv-band" cx="121" cy="54" rx="27" ry="5" />}
      {band && <><T x={172} y={52}>BAND</T><T x={172} y={66}>AROUND THE</T><T x={172} y={80}>FINGERTIPS</T></>}
      <T x={14} y={146}>PALM TOWARD YOU</T>
    </>
  );
}

/** Side view: hand flat palm down, the other hand presses on the fingers; push up, no movement. */
function FingerHold() {
  return (
    <>
      <rect className="mv-ground" x="6" y="98" width="228" height="12" rx="6" />
      <rect className="mv-limb" x="12" y="76" width="112" height="22" rx="11" />
      <rect className="mv-limb" x="116" y="80" width="92" height="16" rx="8" />
      <rect className="mv-palm" x="124" y="92" width="80" height="4" rx="2" />
      <rect className="mv-limb" x="148" y="56" width="66" height="22" rx="11" />
      <rect className="mv-palm" x="154" y="74" width="54" height="4" rx="2" />
      <T x={150} y={48}>OTHER HAND</T>
      <g className="mv-push">
        <Arrow d="M 228 22 L 228 50" head="M 222 46 L 228 56 L 234 46 Z" />
        <Arrow d="M 140 128 L 140 104" head="M 134 108 L 140 98 L 146 108 Z" />
      </g>
      <T x={14} y={132}>FINGERS PUSH UP · NO MOVEMENT</T>
    </>
  );
}

/** Side view: the hand wraps a tennis ball and squeezes it. */
function BallSqueeze() {
  return (
    <>
      <rect className="mv-limb" x="8" y="64" width="96" height="26" rx="13" />
      <g className="mv-joint mv-ball" style={{ transformOrigin: "134px 78px" }}>
        <circle className="mv-ballfill" cx="134" cy="78" r="21" />
        <path className="mv-ballseam" d="M 120 62 Q 134 78 120 94 M 148 62 Q 134 78 148 94" />
      </g>
      <g className="mv-joint mv-grip" style={{ transformOrigin: "134px 78px" }}>
        <path className="mv-fingers-line" d="M 104 60 Q 166 44 162 78 Q 160 110 110 98" />
        <path className="mv-fingers" d="M 104 60 Q 166 44 162 78 Q 160 110 110 98" />
        <rect className="mv-limb" x="108" y="50" width="34" height="13" rx="6.5" />
      </g>
      <T x={176} y={60}>SQUEEZE</T>
      <T x={176} y={74}>HOLD</T>
      <T x={176} y={88}>RELEASE</T>
      <T x={176} y={102}>SLOWLY</T>
    </>
  );
}

const DRAW: Record<MoveId, () => ReactNode> = {
  "wrist-curl": () => <Curl palm="up" />,
  "wrist-ext": () => <Curl palm="down" />,
  radial: () => <Deviation dir="radial" />,
  ulnar: () => <Deviation dir="ulnar" />,
  pronation: () => <Rotation dir="pronation" />,
  supination: () => <Rotation dir="supination" />,
  "finger-band": () => <Hand band />,
  "finger-hold": () => <FingerHold />,
  "ball-squeeze": () => <BallSqueeze />,
};

export function MoveAnim({ id, className }: { id: MoveId; className?: string }) {
  return (
    <svg className={`mv${className ? ` ${className}` : ""}`} viewBox="0 0 240 150" role="img" aria-label={LABEL[id]}>
      {DRAW[id]()}
    </svg>
  );
}
