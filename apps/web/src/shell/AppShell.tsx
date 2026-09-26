// Owner: Shruthi. Top nav (Plan · Readiness Map · Project Defense · Debrief),
// company name + days-left, theme tokens (UI/UX Specs §1.2/§2). M0 scaffold:
// layout shell + <Outlet/> wiring only; TopNav content is M1.
import { Outlet } from "react-router-dom";
import "./theme.css";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__top-nav">
        <span className="app-shell__brand">Compass</span>
        {/* TODO(Shruthi, M1): Plan · Readiness Map · Project Defense · Debrief nav + "Company · N days left" */}
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
