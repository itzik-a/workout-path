// Unit tests (built only with ./build.sh test): drive the runner through the sample and save,
// so the simulator writes a FIT activity to check.
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Test;

// START until the step ends: the first press during a get-ready only starts the set.
function next(r as Runner) as Void {
    if (r.inLead()) { r.onStart(); }
    r.onStart();
}

(:test)
function runsEveryStepAndSaves(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout(), "Test");
    r.onStart(); // begin
    Test.assertEqual(r.phase, :run);
    for (var i = 0; i < r.steps.size(); i++) {
        Test.assertEqual(r.index, i);
        next(r);
    }
    Test.assertEqual(r.phase, :done);
    Test.assertEqual(r.setsDone, 3); // the sample's 3 work steps
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
    var r = new Runner(sampleWorkout(), "Test");
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
    var r = new Runner(sampleWorkout(), "Test");
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
    var r = new Runner(sampleWorkout(), "Test");
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

// Same values as hash() in src/lib/watch.ts gives.
(:test)
function hashMatchesTheWebApp(logger as Test.Logger) as Boolean {
    Test.assertEqual(textHash(""), "1505");
    Test.assertEqual(textHash("a"), "2b606");
    Test.assertEqual(textHash("Push up · Standard\n"), "6625359c");
    Test.assertEqual(textHash("WP1\tx\nX\tWall sit\t\th\t60\n"), "13fc7ddc");
    return true;
}

(:test)
function parsesAWorkoutFile(logger as Test.Logger) as Boolean {
    Application.Storage.setValue("w:test", "WP1\ttest\nC\tplank\tStraight line\n"
        + "X\tPlank\tForearm\th\t60\t-\t1\t3\t\t\t\t-\t\t\tplank\n"
        + "R\t30\tRest\n"
        + "X\tPush up\t\tr\t8\tL\t2\t3\t10\t\t\tc\t1\t2\t\n");
    var s = workoutSteps("test") as Array<Step>;
    Test.assertEqual(s.size(), 3);
    Test.assertEqual(s[0][:name], "Plank · Forearm");
    Test.assertEqual(s[0][:secs], 60);
    Test.assert(s[0][:reps] == null);
    Test.assertEqual(s[0][:cue], "Straight line");
    Test.assertEqual(s[0][:sets], 3);
    Test.assertEqual(s[1][:kind], :rest);
    Test.assertEqual(s[1][:secs], 30);
    Test.assertEqual(s[2][:name], "Push up · left");
    Test.assertEqual(s[2][:reps], 8);
    Test.assertEqual(s[2][:kg], 10);
    Test.assertEqual(s[2][:group], :circuit);
    Test.assertEqual(s[2][:groupN], 2);
    Test.assert(s[2][:cue] == null);
    Application.Storage.deleteValue("w:test");
    return true;
}

(:test)
function listPutsTheNextWorkoutFirst(logger as Test.Logger) as Boolean {
    var saved = Application.Storage.getValue("index");
    Application.Storage.setValue("index", "WP1\t1\nN\tCardio\tb\nW\ta\tFirst\t20\th1\nW\tb\tSecond\t15\th2\tbike\n");
    var e = entries();
    Test.assertEqual(e.size(), 2);
    Test.assertEqual(e[0][:id], "b");
    Test.assertEqual(e[0][:why], "Next · Cardio");
    Test.assertEqual(e[1][:name], "First");
    Test.assertEqual(e[1][:mins], 20);
    Test.assertEqual(e[0][:sport], "bike");
    Test.assertEqual(e[1][:sport], "strength"); // no sport field (an older index): strength
    if (saved != null) { Application.Storage.setValue("index", saved); } else { Application.Storage.deleteValue("index"); }
    return true;
}

// Covered by the watch's own screen: the step holds without stopping the recording, and goes on when it's back.
(:test)
function coveredScreenHoldsTheStep(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout(), "Test");
    r.onStart();
    var before = r.left();
    r.hold();
    Test.assertEqual(r.phase, :paused);
    Test.assert(r.held);
    Test.assertEqual(r.left(), before);
    r.unhold();
    Test.assertEqual(r.phase, :run);
    Test.assert(!r.held);
    Test.assertEqual(r.index, 0);
    // a pause of mine is not undone by the screen coming back
    r.pause();
    r.hold();
    r.unhold();
    Test.assertEqual(r.phase, :paused);
    // covered, then BACK: a real pause, which the screen coming back doesn't resume
    r.resume();
    r.hold();
    r.pause();
    r.unhold();
    Test.assertEqual(r.phase, :paused);
    r.end();
    r.discard();
    return true;
}

// Real names are longer than the lap's Step field (it crashed on the watch at "Iso pull up · Top (chin over bar)").
(:test)
function longNamesFitTheLapField(logger as Test.Logger) as Boolean {
    var r = new Runner([
        { :kind => :work, :name => "Wrist deviation · Ulnar (toward the little finger) · right", :reps => 8 },
        { :kind => :work, :name => "Iso pull up · Top (chin over bar)", :secs => 20 }
    ] as Array<Step>, "Test");
    r.onStart();
    next(r);
    next(r);
    Test.assertEqual(r.phase, :done);
    r.discard();
    return true;
}

// Draw every step (running and paused) and the end on a 454 × 454 off-screen image, as on the 970: a drawing error
// would crash the app mid-workout.
function drawAll(r as Runner) as Void {
    var bmp = Graphics.createBufferedBitmap({ :width => 454, :height => 454 }).get() as Graphics.BufferedBitmap;
    var dc = bmp.getDc();
    var v = new RunView(r);
    v.onUpdate(dc);
    r.onStart();
    var guard = 0;
    while (r.phase != :done && guard < 1000) {
        v.onUpdate(dc);
        r.pause();
        v.onUpdate(dc);
        r.resume();
        r.onStart();
        guard++;
    }
    v.onUpdate(dc);
}

(:test)
function drawsEveryStep(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout(), "A workout name long enough to need two lines or more");
    drawAll(r);
    Test.assertEqual(r.phase, :done);
    r.discard();
    return true;
}

// Get-ready as in the web player: 3 s when a timed set starts the workout, 5 s straight after another set, none
// after a rest; START during it starts the set (same step).
(:test)
function getReadyBeforeTimedSets(logger as Test.Logger) as Boolean {
    var r = new Runner([
        { :kind => :work, :name => "Hold A", :secs => 20 },
        { :kind => :work, :name => "Hold B", :secs => 30 },
        { :kind => :rest, :name => "Rest", :secs => 10 },
        { :kind => :work, :name => "Hold C", :secs => 15 },
        { :kind => :work, :name => "Reps", :reps => 8 }
    ] as Array<Step>, "Test");
    r.onStart();
    Test.assert(r.inLead());
    Test.assertEqual(r.lead, LEAD_FIRST_MS);
    Test.assertEqual(r.left(), 3);
    r.onStart(); // go now
    Test.assert(!r.inLead());
    Test.assertEqual(r.index, 0);
    Test.assertEqual(r.left(), 20);
    r.onStart();
    Test.assertEqual(r.index, 1);
    Test.assertEqual(r.lead, LEAD_AFTER_SET_MS);
    Test.assertEqual(r.left(), 5);
    // pausing in the get-ready keeps it
    r.pause();
    Test.assert(r.inLead());
    Test.assertEqual(r.left(), 5);
    r.resume();
    next(r);
    Test.assertEqual(r.index, 2); // the rest: no get-ready
    Test.assertEqual(r.lead, 0);
    r.onStart();
    Test.assertEqual(r.index, 3); // after a rest: no get-ready
    Test.assertEqual(r.lead, 0);
    Test.assertEqual(r.left(), 15);
    r.onStart();
    Test.assertEqual(r.index, 4); // reps: no timer
    Test.assert(!r.inLead());
    r.pause();
    r.end();
    r.discard();
    return true;
}

// UP / DOWN change a reps set's count (not below 0); other steps ignore them.
(:test)
function upDownChangeTheReps(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout(), "Test");
    r.onStart();
    Test.assert(!r.adjust(1)); // a hold
    next(r);
    next(r); // the rest, then Push up 8 reps
    Test.assertEqual(r.index, 2);
    Test.assertEqual(r.reps, 8);
    Test.assert(r.adjust(1));
    Test.assertEqual(r.reps, 9);
    for (var i = 0; i < 12; i++) { r.adjust(-1); }
    Test.assertEqual(r.reps, 0);
    next(r);
    Test.assert(r.reps == null); // the rest after it
    r.pause();
    r.end();
    r.discard();
    return true;
}

// Previous step (pause menu): the step before starts again, running.
(:test)
function previousStepGoesBack(logger as Test.Logger) as Boolean {
    var r = new Runner(sampleWorkout(), "Test");
    r.onStart();
    next(r);
    Test.assertEqual(r.index, 1);
    r.pause();
    r.back();
    Test.assertEqual(r.phase, :run);
    Test.assertEqual(r.index, 0);
    Test.assertEqual(r.left(), 3); // its get-ready again (it starts the workout)
    r.pause();
    r.back(); // at the first step: starts it again
    Test.assertEqual(r.index, 0);
    r.pause();
    r.end();
    r.discard();
    return true;
}

// Each activity type starts a recording (running, indoor cycling, cardio, strength).
(:test)
function everySportRecords(logger as Test.Logger) as Boolean {
    var sports = ["run", "bike", "cardio", "strength"];
    for (var i = 0; i < sports.size(); i++) {
        var r = new Runner(sampleWorkout(), "Test");
        r.sport = sports[i];
        r.onStart();
        Test.assertEqual(r.phase, :run);
        next(r);
        r.pause();
        r.end();
        r.discard();
    }
    return true;
}
