// The workout in progress: which step, its timer, and the recording (a lap per step).
import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.FitContributor;
import Toybox.Lang;
import Toybox.System;
import Toybox.Timer;
import Toybox.WatchUi;

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
    var downloadText as String = "Download: waiting";

    private var _session as ActivityRecording.Session?;
    private var _fStep as FitContributor.Field?;
    private var _fReps as FitContributor.Field?;
    private var _fHold as FitContributor.Field?;
    private var _timer as Timer.Timer = new Timer.Timer();

    function initialize(list as Array<Step>) {
        steps = list;
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
        var ms = (endsAt as Number) - System.getTimer();
        return ms <= 0 ? 0 : (ms + 999) / 1000;
    }

    // ── Buttons ─────────────────────────────────────────────
    // START: begin; end a reps step; skip a timed step or rest; on the end screen, save.
    function onStart() as Void {
        if (phase == :ready) {
            begin();
        } else if (phase == :run) {
            endStep();
        } else if (phase == :done) {
            save();
            System.exit();
        }
    }

    // BACK: leave the start screen; end the workout early; on the end screen, discard.
    function onBack() as Boolean {
        if (phase == :ready) { return false; }
        if (phase == :run) {
            finish();
        } else if (phase == :done) {
            discard();
            System.exit();
        }
        return true;
    }

    // ── Workout ─────────────────────────────────────────────
    private function begin() as Void {
        var s = ActivityRecording.createSession({
            :name => "Workout Path test",
            :sport => Activity.SPORT_TRAINING,
            :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING
        });
        _fStep = s.createField("step", 0, FitContributor.DATA_TYPE_STRING, { :mesgType => FitContributor.MESG_TYPE_LAP, :count => 32 });
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
        (_fStep as FitContributor.Field).setData(st[:name] as String);
        (_fReps as FitContributor.Field).setData(reps != null ? reps as Number : 0);
        (_fHold as FitContributor.Field).setData(st[:kind] == :work && reps == null ? secs : 0);
        s.addLap();
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

    private function discard() as Void {
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

    // ── Test download (W1): the sync gist's file, through the phone ──
    // Without a gist URL (the store build), a small public file from the repo: same path through the phone.
    function download() as Void {
        var url = GIST_RAW_URL.length() > 0 ? GIST_RAW_URL
            : "https://raw.githubusercontent.com/itzik-a/workout-path/main/src/data/progressions.ts";
        Communications.makeWebRequest(url, null, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_TEXT_PLAIN
        }, method(:onDownload));
    }

    function onDownload(code as Number, data as Dictionary or String or Null) as Void {
        if (code == 200 && data instanceof String) {
            downloadText = "Download OK: " + (data as String).length() + " chars";
        } else {
            downloadText = "Download failed: " + code;
        }
        System.println(downloadText);
        WatchUi.requestUpdate();
    }
}
