/* Pick a starter workout. */
import { useEffect, useRef } from "react";
import { TEMPLATES } from "../data/templates";
import { fromTemplate, getExercise, workoutSummary } from "../lib/workout";
import { createFromTemplate } from "../state/actions";
import { showToast } from "../lib/toast";

export function TemplatesSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="tpl-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      <div className="dlg-body">
        <div className="dlg-grip" aria-hidden="true" />
        <div className="card-head">
          <h2 id="tpl-title">Start from a template</h2>
          <button type="button" className="btn ghost sm" onClick={() => ref.current?.close()}>Close</button>
        </div>
        <p className="muted small">Built from your catalog and home equipment. Picking one makes a normal workout you can change.</p>
        <ul className="tpl-list">
          {TEMPLATES.map((t) => {
            const preview = fromTemplate(t, t.name, 60);
            const names = [...new Set(preview.blocks.flatMap((b) => b.items.map((it) => getExercise(it.exerciseId)?.name ?? "")))];
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className="tpl"
                  onClick={() => {
                    const id = createFromTemplate(t);
                    ref.current?.close();
                    location.hash = `#workouts/${id}`;
                    showToast(`Added ${t.name}`);
                  }}
                >
                  <span className="tpl-name">{t.name}</span>
                  <span className="muted small">{workoutSummary(preview)}</span>
                  <span className="small">{t.blurb}</span>
                  <span className="tpl-ex">{names.join(" · ")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
