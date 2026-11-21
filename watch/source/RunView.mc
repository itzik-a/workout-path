// The one screen: start, the current step, or the end. Black background (AMOLED).
import Toybox.Activity;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

const ACCENT = 0xE8661C; // the web app's orange (dark theme)
const REST = 0x4FA3E0;
const DIM = 0x9A9A9A;
// Shown on the start screen; keep it equal to the version typed in at upload (apps.garmin.com).
const VERSION = "0.1.6";

class RunView extends WatchUi.View {
    private var _r as Runner;

    function initialize(runner as Runner) {
        View.initialize();
        _r = runner;
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        if (_r.phase == :ready) {
            drawReady(dc);
        } else if (_r.phase == :run || _r.phase == :paused) {
            drawStep(dc);
        } else {
            drawDone(dc);
        }
    }

    private function drawReady(dc as Graphics.Dc) as Void {
        var w = dc.getWidth(), h = dc.getHeight(), x = w / 2;
        text(dc, x, h * 0.26, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Workout Path");
        text(dc, x, h * 0.40, Graphics.FONT_SMALL, DIM, "Test · " + _r.steps.size() + " steps");
        text(dc, x, h * 0.54, Graphics.FONT_XTINY, DIM, _r.downloadText);
        text(dc, x, h * 0.72, Graphics.FONT_SMALL, ACCENT, "START to begin");
        text(dc, x, h * 0.86, Graphics.FONT_XTINY, DIM, "v" + VERSION + "  " + _r.inputLog);
    }

    private function drawStep(dc as Graphics.Dc) as Void {
        var w = dc.getWidth(), h = dc.getHeight(), x = w / 2;
        var st = _r.step();
        var rest = st[:kind] == :rest;
        var colour = _r.phase == :paused ? DIM : rest ? REST : ACCENT;
        var secs = st[:secs];

        // Ring: time left in a timed step.
        if (secs != null) {
            var frac = _r.left().toFloat() / (secs as Number);
            dc.setPenWidth(10);
            dc.setColor(0x262626, Graphics.COLOR_TRANSPARENT);
            dc.drawCircle(x, h / 2, x - 8);
            if (frac > 0) {
                dc.setColor(colour, Graphics.COLOR_TRANSPARENT);
                dc.drawArc(x, h / 2, x - 8, Graphics.ARC_CLOCKWISE, 90, 90 - (360 * frac).toNumber());
            }
        }

        var hr = Activity.getActivityInfo().currentHeartRate;
        var top = _r.phase == :paused ? "Paused" : (_r.index + 1) + " / " + _r.steps.size() + (hr != null ? "   HR " + hr : "");
        text(dc, x, h * 0.16, Graphics.FONT_XTINY, DIM, top);

        var name = st[:name] as String;
        var font = dc.getTextWidthInPixels(name, Graphics.FONT_MEDIUM) > w * 0.8 ? Graphics.FONT_SMALL : Graphics.FONT_MEDIUM;
        text(dc, x, h * 0.30, font, rest ? REST : Graphics.COLOR_WHITE, name);

        var reps = st[:reps];
        if (reps != null) {
            text(dc, x, h * 0.48, Graphics.FONT_NUMBER_HOT, Graphics.COLOR_WHITE, (reps as Number).toString());
            text(dc, x, h * 0.62, Graphics.FONT_XTINY, DIM, "reps · START when done");
        } else {
            text(dc, x, h * 0.48, Graphics.FONT_NUMBER_HOT, Graphics.COLOR_WHITE, clock(_r.left()));
        }

        var cue = st[:cue];
        if (cue != null) {
            var fitted = Graphics.fitTextToArea(cue as String, Graphics.FONT_XTINY, w * 0.72, h * 0.14, true);
            text(dc, x, h * 0.74, Graphics.FONT_XTINY, Graphics.COLOR_WHITE, fitted);
        }

        var next = _r.nextStep();
        if (_r.phase == :paused) {
            text(dc, x, h * 0.88, Graphics.FONT_XTINY, ACCENT, "Tap or START to resume");
        } else if (next != null) {
            var n = next[:secs];
            text(dc, x, h * 0.88, Graphics.FONT_XTINY, DIM, "Next: " + next[:name] + (n != null ? " " + clock(n as Number) : ""));
        }
        text(dc, x, h * 0.94, Graphics.FONT_XTINY, 0x5A5A5A, _r.inputLog);
    }

    private function drawDone(dc as Graphics.Dc) as Void {
        var w = dc.getWidth(), h = dc.getHeight(), x = w / 2;
        text(dc, x, h * 0.28, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Done");
        text(dc, x, h * 0.42, Graphics.FONT_SMALL, DIM, clock((_r.finishedAt - _r.startedAt) / 1000));
        text(dc, x, h * 0.60, Graphics.FONT_SMALL, ACCENT, "START  save");
        text(dc, x, h * 0.72, Graphics.FONT_SMALL, DIM, "BACK  more");
    }

    private function text(dc as Graphics.Dc, x as Numeric, y as Numeric, font as Graphics.FontType, colour as Number, s as String) as Void {
        dc.setColor(colour, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, font, s, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

// 75 → "1:15", 20 → "20"
function clock(s as Number) as String {
    return s >= 60 ? (s / 60) + ":" + (s % 60).format("%02d") : s.toString();
}

class RunDelegate extends WatchUi.BehaviorDelegate {
    private var _r as Runner;

    function initialize(runner as Runner) {
        BehaviorDelegate.initialize();
        _r = runner;
    }

    // On the watch START didn't come in as KEY_ENTER (it paused like a tap), so: either START code, seen on press,
    // release or onKey; a tap seen in onTap; and a select is ignored right after either (it's the same press), else
    // it counts as START. inputLog shows what came in, to check this on the watch.
    private var _keyAt as Number = -10000;
    private var _tapAt as Number = -10000;

    private function isStart(evt as WatchUi.KeyEvent) as Boolean {
        var k = evt.getKey();
        return k == WatchUi.KEY_ENTER || k == WatchUi.KEY_START;
    }

    private function recent(t as Number) as Boolean {
        return System.getTimer() - t < 600;
    }

    function onKeyPressed(evt as WatchUi.KeyEvent) as Boolean {
        _r.note("P" + evt.getKey());
        if (!isStart(evt)) { return false; }
        if (!recent(_keyAt)) { _r.onStart(); }
        _keyAt = System.getTimer();
        return true;
    }

    function onKeyReleased(evt as WatchUi.KeyEvent) as Boolean {
        if (!isStart(evt)) { return false; }
        _keyAt = System.getTimer();
        return true;
    }

    function onKey(evt as WatchUi.KeyEvent) as Boolean {
        _r.note("K" + evt.getKey());
        if (!isStart(evt)) { return false; } // BACK etc. go on to the behaviours below
        if (!recent(_keyAt)) { _r.onStart(); }
        _keyAt = System.getTimer();
        return true;
    }

    function onTap(evt as WatchUi.ClickEvent) as Boolean {
        _r.note("T");
        _tapAt = System.getTimer();
        if (!_r.onTap()) { _r.onStart(); } // on the start screen a tap starts
        return true;
    }

    function onSelect() as Boolean {
        if (recent(_keyAt) || recent(_tapAt)) {
            _r.note("s");
        } else {
            _r.note("S");
            _r.onStart();
        }
        return true;
    }

    function onBack() as Boolean {
        return _r.onBack();
    }
}
