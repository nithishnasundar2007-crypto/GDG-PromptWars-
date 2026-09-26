import { Link, Outlet, useLocation } from "react-router-dom";
import "./theme.css";

export function AppShell() {
  const location = useLocation();

  // Determine which nav item is active
  const isIntroduce = location.pathname === "/" || location.pathname === "/introduce";
  const isPlan = location.pathname.startsWith("/plan") || location.pathname.startsWith("/round-map");
  const isProbe = location.pathname.startsWith("/practice") || location.pathname.startsWith("/probe") || location.pathname.startsWith("/drill");
  const isReadiness = location.pathname.startsWith("/map") || location.pathname.startsWith("/readiness");
  const isDefense = location.pathname.startsWith("/project") || location.pathname.startsWith("/defense");

  const copyShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    alert("Page link copied to clipboard!");
  };

  return (
    <div className="app-shell">
      <header className="app-shell__top-nav">
        <div className="app-shell__brand-group">
          <Link to="/" style={{ textDecoration: "none" }}>
            <span className="app-shell__brand">COMPASS</span>
          </Link>
          <div className="app-shell__brand-sub">
            <span className="app-shell__brand-sub-title">Placement Preparation Coach</span>
            <span className="app-shell__brand-sub-tagline">AI-Powered • Probe • Fix • Prove</span>
          </div>
        </div>

        <nav className="app-shell__nav-links">
          <Link
            to="/"
            className={`app-shell__nav-item ${isIntroduce ? "active" : ""}`}
          >
            <span className="app-shell__nav-num">01</span> INTRODUCE
          </Link>
          <Link
            to="/plan"
            className={`app-shell__nav-item ${isPlan ? "active" : ""}`}
          >
            <span className="app-shell__nav-num">02</span> PLAN
          </Link>
          <Link
            to="/practice"
            className={`app-shell__nav-item ${isProbe ? "active" : ""}`}
          >
            <span className="app-shell__nav-num">03</span> PROBE
          </Link>
          <Link
            to="/map"
            className={`app-shell__nav-item ${isReadiness ? "active" : ""}`}
          >
            <span className="app-shell__nav-num">04</span> READINESS
          </Link>
          <Link
            to="/project"
            className={`app-shell__nav-item ${isDefense ? "active" : ""}`}
          >
            <span className="app-shell__nav-num">05</span> DEFENSE
          </Link>
        </nav>

        <div className="app-shell__actions">
          <div className="app-shell__red-divider" />
          <button
            className="app-shell__action-btn"
            title="Share"
            onClick={copyShareLink}
            aria-label="Share"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <Link
            to="/profile"
            className="app-shell__action-btn"
            title="Profile & Settings"
            aria-label="Profile"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
