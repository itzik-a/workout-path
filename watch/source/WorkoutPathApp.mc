// Workout Path on the watch (PLAN.md §10): my workouts from the sync gist (Data.mc), a list with today's first
// (Home.mc), and the player that records them as strength training with a lap per step (Runner.mc, RunView.mc).
import Toybox.Application;
import Toybox.Lang;
import Toybox.Sensor;
import Toybox.WatchUi;

class WorkoutPathApp extends Application.AppBase {
    var runner as Runner?;
    var sync as Sync;
    private var _home as Home?;

    function initialize() {
        AppBase.initialize();
        sync = new Sync(method(:onSync));
    }

    function onStart(state as Dictionary?) as Void {
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
    }

    // Leaving the app mid-workout keeps what was recorded.
    function onStop(state as Dictionary?) as Void {
        var r = runner;
        if (r != null) { r.save(); }
    }

    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        var home = new Home(self);
        _home = home;
        sync.start();
        return [home, new HomeDelegate(home)];
    }

    // A download moved on or finished: refresh the list.
    function onSync() as Void {
        var home = _home;
        if (home != null) { home.fill(); }
        WatchUi.requestUpdate();
    }

    // The sync address was changed in the phone app.
    function onSettingsChanged() as Void {
        sync.start();
    }
}
