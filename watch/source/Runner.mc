// The workout in progress: which step, its timer, and the recording (a lap per step).
import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Application;
import Toybox.Attention;
import Toybox.FitContributor;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

// The lap's Step field: bytes, with the null at the end. Longer text crashes setData ("string too long for allocated
// space": it did on the watch at a 34-byte name), so names are cut to fit (fitBytes). Apps get 256 bytes per message.
const STEP_BYTES = 64;

// `s` cut at a character boundary to at most `max` UTF-8 bytes ("·" is 2).
function fitBytes(s as String, max as Number) as String {
    if (s.toUtf8Array().size() <= max) { return s; }
    var n = s.length() < max ? s.length() : max;
    while (n > 0 && (s.substring(0, n) as String).toUtf8Array().size() > max) { n -= 1; }
    return s.substring(0, n) as String;
}

// Get-ready time before a timed set (as in the web player): 3 s when it starts the workout, 5 s when it follows
// another set with no rest between; none after a rest (the rest's 3-2-1 is the get-ready).
const LEAD_FIRST_MS = 3000;
const LEAD_AFTER_SET_MS = 5000;

class Runner {
    // :ready (start screen) → :run ⇄ :paused → :done (save or discard)
    var phase as Symbol = :ready;
    var steps as Array<Step>;
    var index as Number = 0;
    var title as String;
    // what it's recorded as (from the web app, Data.mc): "strength" | "run" | "bike" | "cardio"
    var sport as String = "strength";
    // work steps finished (for the end screen)
    var setsDone as Number = 0;
    // System.getTimer() ms. A timed step (hold, time, rest) ends at endsAt: `lead` ms of get-ready, then `dur` ms.
    var stepStart as Number = 0;
    var endsAt as Number? = null;
    var dur as Number = 0;
    var lead as Number = 0;
    // a reps step: the count shown (the target; UP / DOWN change it), recorded on the lap
    var reps as Number? = null;
    var startedAt as Number = 0;
    var finishedAt as Number = 0;
    // Paused by hold() (something covered the screen), not by me: the recording goes on, and it resumes by itself.
    var held as Boolean = false;
    // while paused: when it started, and what was left of a timed step
    private var _pausedAt as Number = 0;
    private var _leftMs as Number? = null;
    // the last 3-2-1 second beeped, and whether the get-ready was still on at the last tick
    private var _beeped as Number = -1;
    private var _wasLead as Boolean = false;

    private var _session as ActivityRecording.Session?;
    private var _fStep as FitContributor.Field?;
    private var _fReps as FitContributor.Field?;
    private var _fHold as FitContributor.Field?;
    private var _timer as Timer.Timer = new Timer.Timer();

    function initialize(list as Array<Step>, name as String) {
        steps = list;
        title = name;
    }

    function step() as Step {
        return steps[index];
    }

    function nextStep() as Step? {
        return index + 1 < steps.size() ? steps[index + 1] : null;
    }

    // ms left until endsAt (frozen while paused)
    private function leftMs() as Number {
        if (endsAt == null) { return 0; }
        var ms = phase == :paused && _leftMs != null ? _leftMs as Number : (endsAt as Number) - System.getTimer();
        return ms < 0 ? 0 : ms;
    }

    // In the get-ready before a timed set.
    function inLead() as Boolean {
        return endsAt != null && lead > 0 && leftMs() > dur;
    }

    // Seconds on the big countdown: the get-ready's, else the step's (rounded up, so 0 only at the end).
    function left() as Number {
        var ms = leftMs();
        if (inLead()) { ms -= dur; }
        return (ms + 999) / 1000;
    }

    // How much of the countdown is left, 1 → 0, for the ring.
    function fraction() as Float {
        if (endsAt == null) { return 0.0; }
        var ms = leftMs();
        if (inLead()) { return (ms - dur).toFloat() / lead; }
        return dur > 0 ? ms.toFloat() / dur : 0.0;
    }

    // ── Buttons ─────────────────────────────────────────────
    // START: begin; end a reps set; during a get-ready, go now; skip a timed set or rest; on the end screen, save.
    function onStart() as Void {
        if (phase == :ready) {
            begin();
        } else if (phase == :run) {
            if (inLead()) {
                var now = System.getTimer();
                lead = now - stepStart; // the get-ready as it was, so the lap's hold time stays right
                endsAt = now + dur;
                _wasLead = false;
                go();
                WatchUi.requestUpdate();
            } else {
                endStep();
            }
        } else if (phase == :paused) {
            resume();
        } else if (phase == :done) {
            save();
            leaveWorkout(true, 1);
        }
    }

    // Tap on the screen: pause / resume, like tapping the ring in the web app's player.
    // On the start screen a tap starts (false = handled as START); on the end screen it does nothing.
    function onTap() as Boolean {
        if (phase == :ready) { return false; }
        if (phase == :run) {
            pause();
        } else if (phase == :paused) {
            resume();
        }
        return true;
    }

    // BACK: leave the start screen; during the workout (or paused by a tap), pause and open the menu (Resume / Skip /
    // Previous / Save / Discard), so a press by mistake costs nothing; on the end screen, the menu without those.
    function onBack() as Boolean {
        if (phase == :ready) { return false; }
        if (phase == :run || phase == :paused) {
            pause();
            openMenu(self, true);
        } else if (phase == :done) {
            openMenu(self, false);
        }
        return true;
    }

    // UP / DOWN on a reps set: I did more or fewer. False = not a reps set (the key does its usual thing).
    function adjust(by as Number) as Boolean {
        if ((phase != :run && phase != :paused) || reps == null) { return false; }
        var n = (reps as Number) + by;
        reps = n < 0 ? 0 : n;
        WatchUi.requestUpdate();
        return true;
    }

    // ── Workout ─────────────────────────────────────────────
    private function begin() as Void {
        // Running / spinning / other cardio workouts get their own activity type in Connect; the rest strength.
        var sp = Activity.SPORT_TRAINING, sub = Activity.SUB_SPORT_STRENGTH_TRAINING;
        if (sport.equals("run")) {
            sp = Activity.SPORT_RUNNING; sub = Activity.SUB_SPORT_GENERIC;
        } else if (sport.equals("bike")) {
            sp = Activity.SPORT_CYCLING; sub = Activity.SUB_SPORT_INDOOR_CYCLING;
        } else if (sport.equals("cardio")) {
            sub = Activity.SUB_SPORT_CARDIO_TRAINING;
        }
        var s = ActivityRecording.createSession({
            :name => title.length() > 32 ? title.substring(0, 32) as String : title,
            :sport => sp,
            :subSport => sub
        });
        _fStep = s.createField("step", 0, FitContributor.DATA_TYPE_STRING, { :mesgType => FitContributor.MESG_TYPE_LAP, :count => STEP_BYTES });
        _fReps = s.createField("reps", 1, FitContributor.DATA_TYPE_UINT16, { :mesgType => FitContributor.MESG_TYPE_LAP, :units => "reps" });
        _fHold = s.createField("hold", 2, FitContributor.DATA_TYPE_UINT16, { :mesgType => FitContributor.MESG_TYPE_LAP, :units => "s" });
        s.start();
        _session = s;
        phase = :run;
        startedAt = System.getTimer();
        index = 0;
        startStep();
        _timer.start(method(:tick), 250, true);
    }

    private function startStep() as Void {
        var st = step();
        var now = System.getTimer();
        stepStart = now;
        var secs = st[:secs];
        var work = st[:kind] == :work;
        lead = 0;
        if (work && secs != null) {
            var prev = index > 0 ? steps[index - 1] : null;
            lead = prev == null ? LEAD_FIRST_MS : prev[:kind] == :work ? LEAD_AFTER_SET_MS : 0;
        }
        dur = secs != null ? (secs as Number) * 1000 : 0;
        endsAt = secs != null ? now + lead + dur : null;
        reps = st[:reps];
        _beeped = -1;
        _wasLead = lead > 0;
        if (work && lead == 0) { go(); } else if (lead > 0) { nudge(); }
        WatchUi.requestUpdate();
    }

    function tick() as Void {
        if (phase != :run) { return; }
        if (endsAt != null) {
            var ms = (endsAt as Number) - System.getTimer();
            if (ms <= 0) {
                if (step()[:kind] == :work) { setDone(); }
                endStep();
                return;
            }
            var lead_ = inLead();
            if (_wasLead && !lead_) { go(); }
            _wasLead = lead_;
            // 3-2-1 before a get-ready or a rest ends
            if (lead_ || step()[:kind] == :rest) {
                var s = ((lead_ ? ms - dur : ms) + 999) / 1000;
                if (s <= 3 && s != _beeped) { _beeped = s; countBeep(); }
            }
        }
        WatchUi.requestUpdate();
    }

    // Close the step's lap with my numbers, then go on (or finish after the last).
    private function endStep() as Void {
        lap();
        if (step()[:kind] == :work) { setsDone += 1; }
        if (index + 1 < steps.size()) {
            index += 1;
            startStep();
        } else {
            finish();
        }
    }

    // Back one step (from the pause menu): this one's lap closes as it is, and the one before starts again.
    function back() as Void {
        resume();
        if (phase != :run) { return; }
        lap();
        if (index > 0) { index -= 1; }
        startStep();
    }

    private function lap() as Void {
        var s = _session;
        if (s == null) { return; }
        var st = step();
        var worked = (System.getTimer() - stepStart - lead) / 1000;
        (_fStep as FitContributor.Field).setData(fitBytes(st[:name] as String, STEP_BYTES - 1));
        (_fReps as FitContributor.Field).setData(reps != null ? reps as Number : 0);
        (_fHold as FitContributor.Field).setData(st[:kind] == :work && reps == null && worked > 0 ? worked : 0);
        s.addLap();
    }

    // Freeze the step and pause the recording (its timer stops, as with Garmin's own pause).
    function pause() as Void {
        if (held) {
            held = false; // covered, then paused by me: now a real pause
        } else if (phase == :run) {
            freeze();
        } else {
            return;
        }
        var s = _session;
        if (s != null && s.isRecording()) { s.stop(); }
        WatchUi.requestUpdate();
    }

    // Something covered the workout screen (the watch's own "Set 1" screen when the recording starts, a phone
    // notification): hold the step's timer until the screen is back (unhold), so the step doesn't run unseen.
    // The recording goes on.
    function hold() as Void {
        if (phase != :run) { return; }
        freeze();
        held = true;
    }

    function unhold() as Void {
        if (held) {
            held = false;
            resume();
        }
    }

    private function freeze() as Void {
        _timer.stop();
        _pausedAt = System.getTimer();
        _leftMs = endsAt != null ? (endsAt as Number) - _pausedAt : null;
        phase = :paused;
    }

    // Go on with the same step: the time away doesn't count, a timed step keeps what it had left.
    function resume() as Void {
        if (phase != :paused) { return; }
        held = false;
        var now = System.getTimer(), away = now - _pausedAt;
        stepStart += away;
        startedAt += away;
        endsAt = _leftMs != null ? now + (_leftMs as Number) : null;
        var s = _session;
        if (s != null && !s.isRecording()) { s.start(); }
        phase = :run;
        _timer.start(method(:tick), 250, true);
        WatchUi.requestUpdate();
    }

    // Skip from the pause menu: go on running, and close this step's lap as if START ended it.
    function skip() as Void {
        resume();
        if (phase == :run) { endStep(); }
    }

    // End early from the pause menu (Save / Discard).
    function end() as Void {
        if (phase == :paused) {
            finishedAt = _pausedAt;
            phase = :done;
        }
    }

    private function finish() as Void {
        if (phase != :run) { return; }
        _timer.stop();
        var s = _session;
        if (s != null && s.isRecording()) { s.stop(); }
        finishedAt = System.getTimer();
        phase = :done;
        signal(Attention.TONE_SUCCESS, 100, 600);
        WatchUi.requestUpdate();
    }

    function save() as Void {
        var s = _session;
        if (s == null) { return; }
        if (s.isRecording()) { s.stop(); }
        s.save();
        _session = null;
    }

    function discard() as Void {
        var s = _session;
        if (s == null) { return; }
        if (s.isRecording()) { s.stop(); }
        s.discard();
        _session = null;
    }

    // ── Sound and vibration (the watch's own sound settings apply) ──
    private function go() as Void { signal(Attention.TONE_START, 100, 400); }        // work starts
    private function setDone() as Void { signal(Attention.TONE_STOP, 100, 600); }    // a timed set ended
    private function countBeep() as Void { signal(Attention.TONE_KEY, 50, 100); }    // 3-2-1
    private function nudge() as Void { signal(null, 50, 150); }                      // a get-ready begins

    private function signal(tone as Attention.Tone?, strength as Number, ms as Number) as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(strength, ms)]);
        }
        if (tone != null && Attention has :playTone) {
            Attention.playTone(tone);
        }
    }
}

// Back to the list after Save / Discard: pop `views` (the workout screen, and the menu if it's open), with a toast.
function leaveWorkout(saved as Boolean, views as Number) as Void {
    var app = Application.getApp() as WorkoutPathApp;
    app.runner = null;
    for (var i = 0; i < views; i++) { WatchUi.popView(WatchUi.SLIDE_RIGHT); }
    if (WatchUi has :showToast) { WatchUi.showToast(saved ? "Saved" : "Discarded", null); }
}
