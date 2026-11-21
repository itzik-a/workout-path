// The workout screen: start, the current step (a set, its get-ready, or a rest with what's next), or the end.
// Black background (AMOLED).
import Toybox.Activity;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

const ACCENT = 0xE8661C; // the web app's orange (dark theme)
const REST = 0x4FA3E0;
const DIM = 0x9A9A9A;
// Shown on the start screen; keep it equal to the version typed in at upload (apps.garmin.com).
const VERSION = "0.2.0";

class RunView extends WatchUi.View {
    private var _r as Runner;

    function initialize(runner as Runner) {
        View.initialize();
        _r = runner;
    }

    // Covered by something else (not my own pause menu, which pauses first): hold the step until it's back.
    function onHide() as Void {
        _r.hold();
    }

    function onShow() as Void {
        _r.unhold();
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
        var title = Graphics.fitTextToArea(_r.title, Graphics.FONT_MEDIUM, w * 0.8, h * 0.24, true);
        text(dc, x, h * 0.32, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, title != null ? title : _r.title);
        text(dc, x, h * 0.52, Graphics.FONT_SMALL, DIM, _r.steps.size() + " steps");
        text(dc, x, h * 0.72, Graphics.FONT_SMALL, ACCENT, "START to begin");
        text(dc, x, h * 0.86, Graphics.FONT_XTINY, DIM, "v" + VERSION);
    }

    private function drawStep(dc as Graphics.Dc) as Void {
        var w = dc.getWidth(), h = dc.getHeight(), x = w / 2;
        var st = _r.step();
        var rest = st[:kind] == :rest;
        var paused = _r.phase == :paused;
        var lead = _r.inLead();
        var colour = paused ? DIM : rest ? REST : ACCENT;

        // Ring: what's left of the countdown (get-ready, hold, rest).
        if (st[:secs] != null) {
            var frac = _r.fraction();
            dc.setPenWidth(10);
            dc.setColor(0x262626, Graphics.COLOR_TRANSPARENT);
            dc.drawCircle(x, h / 2, x - 8);
            if (frac > 0) {
                dc.setColor(colour, Graphics.COLOR_TRANSPARENT);
                dc.drawArc(x, h / 2, x - 8, Graphics.ARC_CLOCKWISE, 90, 90 - (360 * frac).toNumber());
            }
        }

        // Top: paused, or where I am (set / round), and heart rate.
        var info = Activity.getActivityInfo();
        var hr = info != null ? info.currentHeartRate : null;
        var top = paused ? "Paused" : join([context(st), hr != null ? "HR " + hr : null]);
        // Rows, from the 970's font heights (XTINY 37 px, SMALL 53, MEDIUM 61, NUMBER_HOT 140; the digits fill less).
        text(dc, x, h * 0.128, Graphics.FONT_XTINY, paused ? ACCENT : DIM, top);

        if (rest) {
            text(dc, x, h * 0.253, Graphics.FONT_MEDIUM, REST, st[:name] as String);
            text(dc, x, h * 0.495, Graphics.FONT_NUMBER_HOT, Graphics.COLOR_WHITE, clock(_r.left()));
            // what's next, big enough to get ready for it
            var next = _r.nextStep();
            if (next != null) {
                text(dc, x, h * 0.655, Graphics.FONT_XTINY, DIM, "Next");
                drawName(dc, next, x, h * 0.75, w * 0.78, Graphics.FONT_SMALL);
                line(dc, x, h * 0.85, w * 0.7, ACCENT, join([next[:sub] as String?, tags(next), dose(next)]));
            }
            return;
        }

        drawName(dc, st, x, h * 0.253, w * 0.8, Graphics.FONT_MEDIUM);
        var sub = st[:sub];
        if (sub != null && (sub as String).length() > 0) { line(dc, x, h * 0.36, w * 0.78, DIM, sub as String); }

        // The big number, and under it what it is: reps (and the target if I changed it), get ready, or the tags.
        var tag = tags(st);
        if (_r.reps != null) {
            text(dc, x, h * 0.577, Graphics.FONT_NUMBER_HOT, Graphics.COLOR_WHITE, (_r.reps as Number).toString());
            var target = st[:reps];
            line(dc, x, h * 0.76, w * 0.7, DIM, join([target != null && target != _r.reps ? "reps · target " + target : "reps", tag]));
        } else {
            text(dc, x, h * 0.577, Graphics.FONT_NUMBER_HOT, lead ? ACCENT : Graphics.COLOR_WHITE, clock(_r.left()));
            line(dc, x, h * 0.76, w * 0.7, ACCENT, lead ? "Get ready" : tag);
        }

        var next = _r.nextStep();
        if (next != null) {
            var what = next[:kind] == :rest ? next[:name] + " " + clock(next[:secs] as Number) : join([title(next), dose(next)]);
            line(dc, x, h * 0.87, w * 0.6, DIM, "Next: " + what);
        }
    }

    private function drawDone(dc as Graphics.Dc) as Void {
        var w = dc.getWidth(), h = dc.getHeight(), x = w / 2;
        text(dc, x, h * 0.28, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Done");
        text(dc, x, h * 0.42, Graphics.FONT_SMALL, DIM, clock((_r.finishedAt - _r.startedAt) / 1000));
        text(dc, x, h * 0.60, Graphics.FONT_SMALL, ACCENT, "START  save");
        text(dc, x, h * 0.72, Graphics.FONT_SMALL, DIM, "BACK  more");
    }

    // The exercise's name, one line: in `big`, one size down if it doesn't fit, cut if it still doesn't.
    private function drawName(dc as Graphics.Dc, st as Step, x as Numeric, y as Numeric, width as Numeric, big as Graphics.FontType) as Void {
        var s = title(st);
        var font = dc.getTextWidthInPixels(s, big) <= width ? big : big == Graphics.FONT_MEDIUM ? Graphics.FONT_SMALL : Graphics.FONT_TINY;
        var fitted = Graphics.fitTextToArea(s, font, width, dc.getFontHeight(font), true);
        text(dc, x, y, font, st[:kind] == :rest ? REST : Graphics.COLOR_WHITE, fitted != null ? fitted : s);
    }

    // A small line, cut to fit.
    private function line(dc as Graphics.Dc, x as Numeric, y as Numeric, width as Numeric, colour as Number, s as String) as Void {
        if (s.length() == 0) { return; }
        var fitted = Graphics.fitTextToArea(s, Graphics.FONT_XTINY, width, dc.getFontHeight(Graphics.FONT_XTINY), true);
        text(dc, x, y, Graphics.FONT_XTINY, colour, fitted != null ? fitted : s);
    }

    private function text(dc as Graphics.Dc, x as Numeric, y as Numeric, font as Graphics.FontType, colour as Number, s as String) as Void {
        dc.setColor(colour, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, font, s, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

// The exercise without the variation and side (they have their own lines); the full name for steps without parts.
function title(st as Step) as String {
    var m = st[:main];
    return m != null ? m as String : st[:name] as String;
}

// Where I am in the workout: "Set 2 of 3", "Circuit · round 1 of 3", "" for a single set.
function context(st as Step) as String {
    var set = st[:set], sets = st[:sets];
    if (set == null || sets == null) { return ""; }
    var g = st[:group];
    if (g != null) { return (g == :circuit ? "Circuit" : "Superset") + " · round " + set + " of " + sets; }
    return (sets as Number) > 1 ? "Set " + set + " of " + sets : "";
}

// Side, interval hold and weight: "Left · Hold 2 of 5 · 10 kg".
function tags(st as Step) as String {
    var side = st[:side];
    var holdI = st[:holdI], holdN = st[:holdN], kg = st[:kg];
    return join([
        side != null ? ((side as String).equals("left") ? "Left" : "Right") : null,
        holdI != null && holdN != null ? "Hold " + holdI + " of " + holdN : null,
        kg != null ? kg + " kg" : null
    ]);
}

// How much: "8 reps", "45" (seconds), "1:30".
function dose(st as Step) as String {
    var r = st[:reps], s = st[:secs];
    return r != null ? r + " reps" : s != null ? clock(s as Number) : "";
}

// The non-empty parts, with " · " between.
function join(parts as Array<String?>) as String {
    var out = "";
    for (var i = 0; i < parts.size(); i++) {
        var p = parts[i];
        if (p != null && p.length() > 0) { out = out.length() > 0 ? out + " · " + p : p; }
    }
    return out;
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

    // On the 970 (tested 2026-11-21): START comes as a key (press / release / onKey, ENTER or START code) followed by
    // a select; a tap comes as a select alone, without onTap. So: START = the key; a select right after the key or
    // an onTap is the same press and ignored; any other select is a tap.
    private var _keyAt as Number = -10000;
    private var _tapAt as Number = -10000;

    private function isStart(evt as WatchUi.KeyEvent) as Boolean {
        var k = evt.getKey();
        return k == WatchUi.KEY_ENTER || k == WatchUi.KEY_START;
    }

    private function recent(t as Number) as Boolean {
        return System.getTimer() - t < 1000;
    }

    // UP / DOWN change a reps set's count. Acted on at the press; onKey after it is the same press (flag), and
    // acts only if the press didn't come.
    private var _upDown as Number? = null;

    private function upDown(evt as WatchUi.KeyEvent) as Number {
        var k = evt.getKey();
        return k == WatchUi.KEY_UP ? 1 : k == WatchUi.KEY_DOWN ? -1 : 0;
    }

    function onKeyPressed(evt as WatchUi.KeyEvent) as Boolean {
        var by = upDown(evt);
        if (by != 0) {
            _upDown = evt.getKey();
            return _r.adjust(by);
        }
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
        var by = upDown(evt);
        if (by != 0) {
            if (_upDown == evt.getKey()) { _upDown = null; return _r.reps != null; }
            return _r.adjust(by);
        }
        if (!isStart(evt)) { return false; } // BACK etc. go on to the behaviours below
        if (!recent(_keyAt)) { _r.onStart(); }
        _keyAt = System.getTimer();
        return true;
    }

    function onTap(evt as WatchUi.ClickEvent) as Boolean {
        _tapAt = System.getTimer();
        if (!_r.onTap()) { _r.onStart(); } // on the start screen a tap starts
        return true;
    }

    function onSelect() as Boolean {
        if (!recent(_keyAt) && !recent(_tapAt) && !_r.onTap()) {
            _r.onStart(); // a tap: pause / resume (on the start screen it starts)
        }
        return true;
    }

    function onBack() as Boolean {
        return _r.onBack();
    }

    // Swipes / UP / DOWN as pages: nothing to page through here (UP / DOWN are handled as keys above).
    function onNextPage() as Boolean { return true; }
    function onPreviousPage() as Boolean { return true; }
}
