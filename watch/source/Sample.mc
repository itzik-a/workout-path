// W1's built-in workout: one of each kind of step. W2 replaces it with watch.json from the gist.
import Toybox.Lang;

// A step: :kind (:work / :rest), :name, :cue, and :secs (counts down) or :reps (one press ends it).
typedef Step as { :kind as Symbol, :name as String, :cue as String?, :secs as Number?, :reps as Number? };

function sampleWorkout() as Array<Step> {
    return [
        { :kind => :work, :name => "Active hang", :cue => "Pull the shoulders down, away from the ears", :secs => 20 },
        { :kind => :rest, :name => "Rest", :secs => 15 },
        { :kind => :work, :name => "Push up · Standard", :cue => "Body in one line, chest to the floor", :reps => 8 },
        { :kind => :rest, :name => "Rest", :secs => 10 },
        { :kind => :work, :name => "Wall sit", :cue => "Thighs level, back flat on the wall", :secs => 15 }
    ] as Array<Step>;
}
