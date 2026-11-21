// My workouts on the watch (W2, PLAN.md §10): the files the web app writes into the sync gist (src/lib/watch.ts),
// downloaded through the phone and kept in Application.Storage, so the list works offline.
//   Storage "index" = wpw-index.txt; "w:<id>" = wpw-<id>.txt; "h:<id>" = the hash of the copy kept.
import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// ── Parsing: lines of tab-separated fields ─────────────────────
function rows(text as String) as Array<Array<String> > {
    var out = [] as Array<Array<String> >;
    var chars = text.toCharArray();
    var row = [] as Array<String>;
    var start = 0;
    var n = chars.size();
    for (var i = 0; i < n; i++) {
        var c = chars[i];
        if (c == '\t' || c == '\n') {
            row.add(text.substring(start, i) as String);
            start = i + 1;
            if (c == '\n') { out.add(row); row = [] as Array<String>; }
        }
    }
    if (start < n) { row.add(text.substring(start, n) as String); }
    if (row.size() > 0) { out.add(row); }
    return out;
}

function num(s as String) as Number? {
    return s.length() > 0 ? s.toNumber() : null;
}

// Same as hash() in src/lib/watch.ts: djb2 over the characters, as unsigned 32-bit hex.
function textHash(text as String) as String {
    var h = 5381;
    var chars = text.toCharArray();
    for (var i = 0; i < chars.size(); i++) {
        h = (h << 5) + h + chars[i].toNumber(); // Number is 32-bit and wraps, like JS's | 0
    }
    var u = h.toLong() & 0xFFFFFFFFl;
    if (u == 0) { return "0"; }
    var digits = "0123456789abcdef";
    var s = "";
    while (u > 0) {
        var d = (u % 16).toNumber();
        s = digits.substring(d, d + 1) + s;
        u = u / 16;
    }
    return s;
}

// A workout in the list: :id, :name, :mins, :hash; :why = "Today · <routine>" / "Next · <routine>" for the top ones.
typedef Entry as { :id as String, :name as String, :mins as Number, :hash as String, :why as String? };

// The index as kept: my workouts with today's first (weekly routines by weekday, rotations' next).
function entries() as Array<Entry> {
    var text = Application.Storage.getValue("index") as String?;
    if (text == null) { return [] as Array<Entry>; }
    var all = [] as Array<Entry>;
    var why = {} as Dictionary<String, String>;
    var today = (Gregorian.info(Time.now(), Time.FORMAT_SHORT).day_of_week as Number + 5) % 7; // 0 = Monday, like the web app
    var list = rows(text);
    for (var i = 0; i < list.size(); i++) {
        var r = list[i];
        if (r[0].equals("D") && r.size() >= 9) {
            var id = r[2 + today];
            if (id.length() > 0 && why[id] == null) { why[id] = "Today · " + r[1]; }
        } else if (r[0].equals("N") && r.size() >= 3) {
            if (why[r[2]] == null) { why[r[2]] = "Next · " + r[1]; }
        } else if (r[0].equals("W") && r.size() >= 5) {
            all.add({ :id => r[1], :name => r[2], :mins => num(r[3]) == null ? 0 : num(r[3]) as Number, :hash => r[4] } as Entry);
        }
    }
    var top = [] as Array<Entry>;
    var rest = [] as Array<Entry>;
    for (var i = 0; i < all.size(); i++) {
        var e = all[i];
        var w = why[e[:id]];
        if (w != null) { e[:why] = w; top.add(e); } else { rest.add(e); }
    }
    return top.addAll(rest);
}

function hasWorkout(id as String) as Boolean {
    return Application.Storage.getValue("w:" + id) != null;
}

// A kept workout's steps, for the Runner. Null if it hasn't been downloaded.
function workoutSteps(id as String) as Array<Step>? {
    var text = Application.Storage.getValue("w:" + id) as String?;
    if (text == null) { return null; }
    var cues = {} as Dictionary<String, String>;
    var steps = [] as Array<Step>;
    var list = rows(text);
    for (var i = 0; i < list.size(); i++) {
        var r = list[i];
        if (r[0].equals("C") && r.size() >= 3) {
            cues[r[1]] = r[2];
        } else if (r[0].equals("R") && r.size() >= 3) {
            steps.add({ :kind => :rest, :name => r[2], :secs => num(r[1]) } as Step);
        } else if (r[0].equals("X") && r.size() >= 15) {
            var amount = num(r[4]);
            var timed = !r[3].equals("r");
            var side = r[5].equals("L") ? "left" : r[5].equals("R") ? "right" : null;
            var name = r[1] + (r[2].length() > 0 ? " · " + r[2] : "") + (side != null ? " · " + side : "");
            var st = {
                :kind => :work, :name => name, :main => r[1], :sub => r[2], :side => side,
                :set => num(r[6]), :sets => num(r[7]), :kg => num(r[8]), :holdI => num(r[9]), :holdN => num(r[10]),
                :group => r[11].equals("s") ? :superset : r[11].equals("c") ? :circuit : null,
                :groupI => num(r[12]), :groupN => num(r[13]),
                :cue => r[14].length() > 0 ? cues[r[14]] : null
            };
            if (timed) { st[:secs] = amount; } else { st[:reps] = amount; }
            steps.add(st as Step);
        }
    }
    return steps;
}

// ── Download ───────────────────────────────────────────────────
// The sync address: the app setting (phone), else my local Secrets.mc (simulator); "" = not set.
function syncUrl() as String {
    var u = Application.Properties.getValue("syncUrl") as String?;
    if (u == null || u.length() == 0) { u = DEV_SYNC_URL; }
    if (u.length() > 0 && !u.substring(u.length() - 1, u.length()).equals("/")) { u = u + "/"; }
    return u;
}

// One download at a time: the index, then each workout whose hash changed. `status` is a line for the list.
class Sync {
    var status as String = "";
    var busy as Boolean = false;
    private var _queue as Array<Entry> = [] as Array<Entry>;
    private var _total as Number = 0;
    private var _onChange as Method() as Void;

    function initialize(onChange as Method() as Void) {
        _onChange = onChange;
        var at = Application.Storage.getValue("syncedAt") as Number?;
        status = at != null ? "Updated " + ago(at) : "Not downloaded yet";
    }

    function start() as Void {
        if (busy) { return; }
        if (syncUrl().length() == 0) {
            status = "Set the sync address in the phone app";
            _onChange.invoke();
            return;
        }
        busy = true;
        status = "Downloading…";
        _onChange.invoke();
        get("wpw-index.txt", method(:onIndex));
    }

    private function get(file as String, cb as Method(code as Number, data as Dictionary or String or Null) as Void) as Void {
        // ?t= so a cached copy isn't served after a change
        Communications.makeWebRequest(syncUrl() + file + "?t=" + Time.now().value(), null, {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_TEXT_PLAIN
        }, cb);
    }

    function onIndex(code as Number, data as Dictionary or String or Null) as Void {
        if (code != 200 || !(data instanceof String) || !(data as String).substring(0, 3).equals("WP1")) {
            fail(code);
            return;
        }
        Application.Storage.setValue("index", data as String);
        // Drop workouts that are gone; queue the ones that changed.
        var list = entries();
        var keep = {} as Dictionary<String, Boolean>;
        _queue = [] as Array<Entry>;
        for (var i = 0; i < list.size(); i++) {
            var e = list[i];
            keep[e[:id]] = true;
            if (!e[:hash].equals(Application.Storage.getValue("h:" + e[:id]))) { _queue.add(e); }
        }
        var kept = Application.Storage.getValue("ids") as Array<String>?;
        if (kept != null) {
            for (var i = 0; i < kept.size(); i++) {
                if (keep[kept[i]] == null) {
                    Application.Storage.deleteValue("w:" + kept[i]);
                    Application.Storage.deleteValue("h:" + kept[i]);
                }
            }
        }
        Application.Storage.setValue("ids", keep.keys());
        _total = _queue.size();
        _onChange.invoke();
        next();
    }

    private function next() as Void {
        if (_queue.size() == 0) {
            busy = false;
            Application.Storage.setValue("syncedAt", Time.now().value());
            status = "Updated just now";
            _onChange.invoke();
            return;
        }
        status = "Downloading " + (_total - _queue.size() + 1) + " of " + _total;
        _onChange.invoke();
        get("wpw-" + _queue[0][:id] + ".txt", method(:onWorkout));
    }

    function onWorkout(code as Number, data as Dictionary or String or Null) as Void {
        if (code != 200 || !(data instanceof String)) {
            fail(code);
            return;
        }
        var e = _queue[0];
        var text = data as String;
        Application.Storage.setValue("w:" + e[:id], text);
        // Keep the hash only if this is the version the index names (else a cached old copy: try again next time).
        if (textHash(text).equals(e[:hash])) { Application.Storage.setValue("h:" + e[:id], e[:hash]); }
        _queue = _queue.slice(1, null);
        next();
    }

    private function fail(code as Number) as Void {
        busy = false;
        _queue = [] as Array<Entry>;
        status = code == Communications.BLE_CONNECTION_UNAVAILABLE || code == Communications.BLE_HOST_TIMEOUT
            ? "Phone not connected" : code == 404 ? "Nothing at the sync address (404)" : "Download failed (" + code + ")";
        _onChange.invoke();
    }
}

function ago(at as Number) as String {
    var s = Time.now().value() - at;
    if (s < 90) { return "just now"; }
    if (s < 3600) { return (s / 60) + " min ago"; }
    if (s < 86400) { return (s / 3600) + " h ago"; }
    return (s / 86400) + " days ago";
}
