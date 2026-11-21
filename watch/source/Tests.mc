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

(:test)
function pauseKeepsTheStepAndTimeLeft(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout());
    r.onStart(); // begin: step 1 is a 20 s hold
    var before = r.left();
    r.pause();
    Test.assertEqual(r.phase, :paused);
    Test.assertEqual(r.left(), before);
    r.resume();
    Test.assertEqual(r.phase, :run);
    Test.assertEqual(r.index, 0);
    Test.assert(r.left() >= before - 1);
    r.pause();
    r.end();
    Test.assertEqual(r.phase, :done);
    r.discard();
    return true;
}

(:test)
function skipFromThePauseMenu(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout());
    r.onStart();
    r.pause();
    r.skip();
    Test.assertEqual(r.phase, :run);
    Test.assertEqual(r.index, 1);
    for (var i = 1; i < r.steps.size(); i++) {
        r.pause();
        r.skip();
    }
    Test.assertEqual(r.phase, :done); // skipping the last step finishes
    r.discard();
    return true;
}

(:test)
function tapPausesAndResumes(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout());
    Test.assertEqual(r.onTap(), false); // start screen: a tap is START
    r.onStart();
    Test.assert(r.onTap());
    Test.assertEqual(r.phase, :paused);
    Test.assertEqual(r.index, 0); // no skip
    r.onTap();
    Test.assertEqual(r.phase, :run);
    r.onTap();
    r.onStart(); // START while paused resumes too
    Test.assertEqual(r.phase, :run);
    Test.assertEqual(r.index, 0);
    r.pause();
    r.end();
    r.discard();
    return true;
}
