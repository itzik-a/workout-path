// Workout Path on the watch. W1 (PLAN.md §10): a test app with a built-in sample workout,
// recorded as strength training with a lap per step, plus a test download of the sync gist.
import Toybox.Application;
import Toybox.Lang;
import Toybox.Sensor;
import Toybox.WatchUi;

class WorkoutPathApp extends Application.AppBase {
    private var _runner as Runner?;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
    }

    // Leaving the app mid-workout keeps what was recorded.
    function onStop(state as Dictionary?) as Void {
        if (_runner != null) {
            _runner.save();
        }
    }

    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        var runner = new Runner(sampleWorkout());
        _runner = runner;
        runner.download();
        return [new RunView(runner), new RunDelegate(runner)];
    }
}
