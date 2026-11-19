import { hideToast, useToast } from "../lib/toast";

export function Toast() {
  const t = useToast();
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.text}</span>
      {t.action && (
        <button type="button" onClick={() => { t.action!.run(); hideToast(); }}>{t.action.label}</button>
      )}
    </div>
  );
}
