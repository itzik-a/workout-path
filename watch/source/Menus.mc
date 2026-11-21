// The pause / end menu, like Garmin's own: Resume, Skip and Previous step (while paused), Save, Discard (asks first).
// BACK in the menu resumes when paused, so a BACK pressed by mistake twice still costs nothing.
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

function openMenu(runner as Runner, paused as Boolean) as Void {
    var menu = new WatchUi.Menu2({ :title => paused ? "Paused" : "Done" });
    if (paused) {
        menu.addItem(new WatchUi.MenuItem("Resume", null, :resume, null));
        var next = runner.nextStep();
        menu.addItem(new WatchUi.MenuItem("Skip", next != null ? "Next: " + title(next) : "Finish", :skip, null));
        if (runner.index > 0) {
            menu.addItem(new WatchUi.MenuItem("Previous step", title(runner.steps[runner.index - 1]), :back, null));
        }
    }
    menu.addItem(new WatchUi.MenuItem("Save", null, :save, null));
    menu.addItem(new WatchUi.MenuItem("Discard", null, :discard, null));
    WatchUi.pushView(menu, new MenuDelegate(runner, paused), WatchUi.SLIDE_UP);
}

class MenuDelegate extends WatchUi.Menu2InputDelegate {
    private var _r as Runner;
    private var _paused as Boolean;

    function initialize(runner as Runner, paused as Boolean) {
        Menu2InputDelegate.initialize();
        _r = runner;
        _paused = paused;
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id == :resume) {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
            _r.resume();
        } else if (id == :skip) {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
            _r.skip();
        } else if (id == :back) {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
            _r.back();
        } else if (id == :save) {
            _r.end();
            _r.save();
            System.exit();
        } else if (id == :discard) {
            WatchUi.pushView(new WatchUi.Confirmation("Discard this workout?"), new DiscardDelegate(_r), WatchUi.SLIDE_LEFT);
        }
    }

    function onBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        if (_paused) { _r.resume(); }
    }
}

class DiscardDelegate extends WatchUi.ConfirmationDelegate {
    private var _r as Runner;

    function initialize(runner as Runner) {
        ConfirmationDelegate.initialize();
        _r = runner;
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            _r.discard();
            System.exit();
        }
        // No: back to the menu.
        return true;
    }
}
