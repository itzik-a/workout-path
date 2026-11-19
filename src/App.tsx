import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Catalog } from "./views/Catalog";
import { Placeholder } from "./views/Placeholder";
import { Workouts } from "./views/Workouts";
import { Toast } from "./components/Toast";
import { IconCatalog, IconHistory, IconRoutines, IconToday, IconWorkouts } from "./components/Icons";

export type View = "today" | "workouts" | "routines" | "catalog" | "history";
const TABS: { id: View; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "today", label: "Today", Icon: IconToday },
  { id: "workouts", label: "Workouts", Icon: IconWorkouts },
  { id: "routines", label: "Routines", Icon: IconRoutines },
  { id: "catalog", label: "Catalog", Icon: IconCatalog },
  { id: "history", label: "History", Icon: IconHistory },
];

/** "#catalog/plank" → { view: "catalog", sub: "plank" } */
export interface Route { view: View; sub?: string }

const readHash = (): Route => {
  const [v, sub] = decodeURIComponent(location.hash.slice(1)).split("/");
  const view = TABS.some((t) => t.id === v) ? (v as View) : "today";
  return { view, sub: sub || undefined };
};

export function App() {
  const [route, setRoute] = useState<Route>(readHash);

  useEffect(() => {
    const on = () => setRoute((prev) => {
      const next = readHash();
      if (next.view !== prev.view) window.scrollTo(0, 0);
      return next;
    });
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const { view } = route;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#today" aria-label="Workout Path, today">
          <img src="./icon.svg" alt="" width={30} height={30} />
          <span>Workout Path</span>
        </a>
        <nav className="side-nav" aria-label="Sections">
          {TABS.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} aria-current={view === id ? "page" : undefined}>
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <header className="topbar">
        <a className="brand" href="#today" aria-label="Workout Path, today">
          <img src="./icon.svg" alt="" width={28} height={28} />
          <span>Workout Path</span>
        </a>
      </header>

      <main className={`main view-${view}${route.sub ? " has-sub" : ""}`} key={view}>
        {view === "catalog" ? <Catalog selected={route.sub} />
          : view === "workouts" ? <Workouts sub={route.sub} />
          : <Placeholder view={view} />}
      </main>

      <Toast />

      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => (
          <a key={id} href={`#${id}`} aria-current={view === id ? "page" : undefined}>
            <Icon />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
