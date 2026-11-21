// A small workout for the unit tests (Tests.mc): one of each kind of step.
import Toybox.Lang;

// A step (built in Data.mc from the workout's file): :kind (:work / :rest), :name (shown), :cue, and :secs (counts
// down) or :reps (one press ends it). Work steps also carry the parts for the player: :main / :sub (exercise /
// variation), :side ("left" / "right"), :set of :sets, :kg, :holdI of :holdN (interval holds), :group (:superset /
// :circuit) with :groupI of :groupN.
typedef Step as {
    :kind as Symbol, :name as String, :cue as String?, :secs as Number?, :reps as Number?,
    :main as String?, :sub as String?, :side as String?, :set as Number?, :sets as Number?, :kg as Number?,
    :holdI as Number?, :holdN as Number?, :group as Symbol?, :groupI as Number?, :groupN as Number?
};

function sampleWorkout() as Array<Step> {
    return [
        { :kind => :work, :name => "Active hang", :cue => "Pull the shoulders down, away from the ears", :secs => 20 },
        { :kind => :rest, :name => "Rest", :secs => 15 },
        { :kind => :work, :name => "Push up · Standard", :cue => "Body in one line, chest to the floor", :reps => 8 },
        { :kind => :rest, :name => "Rest", :secs => 10 },
        { :kind => :work, :name => "Wall sit", :cue => "Thighs level, back flat on the wall", :secs => 15 }
    ] as Array<Step>;
}
