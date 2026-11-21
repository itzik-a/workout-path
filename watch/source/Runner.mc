// The workout in progress: which step, its timer, and the recording (a lap per step).
import Toybox.Activity;
import Toybox.ActivityRecording;
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

class Runner {
    // :ready (start screen) → :run → :done (save or discard)
    var phase as Symbol = :ready;
    var steps as Array<Step>;
    var index as Number = 0;
    // System.getTimer() ms: when the current step started, and when a timed one ends
    var stepStart as Number = 0;
    var endsAt as Number? = null;
    var startedAt as Number = 0;
    var finishedAt as Number = 0;
    var title as String;
    // while paused: when it started, and what was left of a timed step
    private var _pausedAt as Number = 0;
    // Paused by hold() (something covered the screen), not by me: the recording goes on, and it resumes by itself.
    var held as Boolean = false;
    private var _leftMs as Number? = null;

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

    // Seconds left in a timed step (rounded up, so 0 only at the end).
    function left() as Number {
        if (endsAt == null) { return 0; }
        var ms = phase == :paused && _leftMs != null ? _leftMs as Number : (endsAt as Number) - System.getTimer();
        return ms <= 0 ? 0 : (ms + 999) / 1000;
    }

    // ── Buttons ─────────────────────────────────────────────
    // START: begin; end a reps step; skip a timed step or rest; on the end screen, save.
    function onStart() as Void {
        if (phase == :ready) {
            begin();
        } else if (phase == :run) {
            endStep();
        } else if (phase == :paused) {
            resume();
        } else if (phase == :done) {
            save();
            System.exit();
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

    // BACK: leave the start screen; during the workout (or paused by a tap), pause and open the menu (Resume / Save /
    // Discard), so a press by mistake costs nothing; on the end screen, the menu without Resume.
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

    // ── Workout ─────────────────────────────────────────────
    private function begin() as Void {
        var s = ActivityRecording.createSession({
            :name => title.length() > 32 ? title.substring(0, 32) as String : title,
            :sport => Activity.SPORT_TRAINING,
            :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING
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
        stepStart = System.getTimer();
        var secs = step()[:secs];
        endsAt = secs != null ? stepStart + (secs as Number) * 1000 : null;
        buzz();
        WatchUi.requestUpdate();
    }

    function tick() as Void {
        if (phase == :run && endsAt != null && System.getTimer() >= (endsAt as Number)) {
            endStep();
        } else {
            WatchUi.requestUpdate();
        }
    }

    // Close the step's lap with my numbers, then go on (or finish after the last).
    private function endStep() as Void {
        lap();
        if (index + 1 < steps.size()) {
            index += 1;
            startStep();
        } else {
            finish();
        }
    }

    private function lap() as Void {
        var s = _session;
        if (s == null) { return; }
        var st = step();
        var secs = (System.getTimer() - stepStart) / 1000;
        var reps = st[:reps];
        (_fStep as FitContributor.Field).setData(fitBytes(st[:name] as String, STEP_BYTES - 1));
        (_fReps as FitContributor.Field).setData(reps != null ? reps as Number : 0);
        (_fHold as FitContributor.Field).setData(st[:kind] == :work && reps == null ? secs : 0);
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
        buzz();
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

    private function buzz() as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(60, 300)]);
        }
        if (Attention has :playTone) {
            Attention.playTone(Attention.TONE_LAP);
        }
    }

}
