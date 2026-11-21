// Unit tests (built only with ./build.sh test): drive the runner through the sample and save,
// so the simulator writes a FIT activity to check.
import Toybox.Lang;
import Toybox.Test;

(:test)
function runsEveryStepAndSaves(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout());
    r.onStart(); // begin
    Test.assertEqual(r.phase, :run);
    for (var i = 0; i < r.steps.size(); i++) {
        Test.assertEqual(r.index, i);
        r.onStart(); // end / skip the step
    }
    Test.assertEqual(r.phase, :done);
    r.save();
    return true;
}

(:test)
function clockFormats(logger as Test.Logger) as Boolean {
    Test.assertEqual(clock(20), "20");
    Test.assertEqual(clock(75), "1:15");
    Test.assertEqual(clock(600), "10:00");
    return true;
}
