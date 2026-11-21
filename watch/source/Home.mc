// The start screen (W2): my workouts, today's first, and a status line that downloads again when picked.
// A pick opens the workout's start screen (RunView, :ready); BACK there comes back here.
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

class Home extends WatchUi.Menu2 {
    var app as WorkoutPathApp;
    private var _count as Number = 0;
    // workout id → its sport, for the runner
    var sports as Dictionary<String, String> = {} as Dictionary<String, String>;

    function initialize(a as WorkoutPathApp) {
        Menu2.initialize({ :title => "Workout Path" });
        app = a;
        fill();
    }

    // The items from what's kept; called again after a download.
    function fill() as Void {
        for (var i = _count - 1; i >= 0; i--) { deleteItem(i); }
        _count = 0;
        var list = entries();
        for (var i = 0; i < list.size(); i++) {
            var e = list[i];
            var sub = e[:why] != null ? e[:why] as String : e[:mins] + " min";
            if (!hasWorkout(e[:id])) { sub = "not downloaded yet"; }
            addItem(new WatchUi.MenuItem(e[:name], sub, e[:id], null));
            sports[e[:id]] = e[:sport];
        }
        addItem(new WatchUi.MenuItem(list.size() == 0 ? "Download" : "Update", app.sync.status + "  v" + VERSION, :sync, null));
        _count = list.size() + 1;
    }

}

class HomeDelegate extends WatchUi.Menu2InputDelegate {
    private var _home as Home;

    function initialize(home as Home) {
        Menu2InputDelegate.initialize();
        _home = home;
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id == :sync) {
            _home.app.sync.start();
            return;
        }
        var steps = workoutSteps(id as String);
        if (steps == null || steps.size() == 0) { return; }
        var sport = _home.sports[id as String];
        var runner = new Runner(steps, item.getLabel());
        if (sport != null) { runner.sport = sport; }
        _home.app.runner = runner;
        WatchUi.pushView(new RunView(runner), new RunDelegate(runner), WatchUi.SLIDE_LEFT);
    }

    function onBack() as Void {
        System.exit();
    }
}
