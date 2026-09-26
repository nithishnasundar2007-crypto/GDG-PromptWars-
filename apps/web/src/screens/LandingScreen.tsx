import { Link } from "react-router-dom";

export function LandingScreen() {
  return (
    <div className="landing-page" style={{ position: "relative", minHeight: "calc(100vh - 64px)", backgroundColor: "#080706", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Hero Visual Area matching 01_landing_page.png */}
      <div 
        style={{
          position: "relative",
          width: "100%",
          minHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "32px 48px",
          background: "radial-gradient(circle at 60% 40%, rgba(255, 60, 0, 0.08) 0%, rgba(8, 7, 6, 0.95) 75%), #080706",
        }}
      >
        {/* Background Image Container */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/assets/landing-hero.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
            opacity: 0.85,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Gradient overlays to blend smoothly */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(8,7,6,0.3) 0%, rgba(8,7,6,0.1) 40%, rgba(8,7,6,0.85) 80%, #080706 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Top spacer */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "flex-end" }}>
          {/* Handwritten Annotation on desk near notebook */}
          <div
            className="font-hand"
            style={{
              color: "#F1EDE3",
              fontSize: "24px",
              fontWeight: 700,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              transform: "rotate(-2deg)",
              marginRight: "240px",
              marginTop: "220px",
            }}
          >
            ↙ FIND THE GAP. FIX IT. PROVE IT.
          </div>
        </div>

        {/* Bottom Hero Section: COMPASS Title, Annotations, and Links */}
        <div style={{ position: "relative", zIndex: 10, marginTop: "auto", paddingBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
            
            {/* Massive Heading COMPASS */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                className="font-display"
                style={{
                  fontSize: "clamp(80px, 14vw, 170px)",
                  lineHeight: 0.85,
                  fontWeight: 700,
                  letterSpacing: "-2px",
                  display: "flex",
                  alignItems: "baseline",
                  userSelect: "none",
                  textShadow: "0 4px 30px rgba(0,0,0,0.9)",
                }}
              >
                <span style={{ color: "#E8E1D5" }}>COMP</span>
                <span style={{ color: "#FF2A1F", textShadow: "0 0 40px rgba(255, 42, 31, 0.4)" }}>ASS</span>
              </div>

              {/* Handwritten Sub-annotation with Underline */}
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span
                  className="font-hand"
                  style={{
                    color: "#F1EDE3",
                    fontSize: "26px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  }}
                >
                  ↓ PREPARE FOR THE NEXT DRIVE
                </span>
                <div
                  style={{
                    width: "280px",
                    height: "4px",
                    background: "rgba(241, 237, 227, 0.8)",
                    borderRadius: "2px",
                    boxShadow: "0 0 10px rgba(241, 237, 227, 0.4)",
                  }}
                />
              </div>
            </div>

            {/* Bottom Right Interactive Navigation CTAs */}
            <div style={{ display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap", paddingBottom: "12px" }}>
              <Link
                to="/coach"
                style={{
                  color: "#F1EDE3",
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 150ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF2A1F")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#F1EDE3")}
              >
                AI COACH ↗
              </Link>
              <Link
                to="/practice"
                style={{
                  color: "#F1EDE3",
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 150ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF2A1F")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#F1EDE3")}
              >
                PROBE LADDER ↗
              </Link>
              <Link
                to="/map"
                style={{
                  color: "#F1EDE3",
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 150ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF2A1F")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#F1EDE3")}
              >
                READINESS MAP ↗
              </Link>
            </div>
          </div>
        </div>

        {/* Right Edge Vertical Text */}
        <div
          style={{
            position: "absolute",
            right: "16px",
            bottom: "80px",
            zIndex: 10,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: "rgba(241, 237, 227, 0.4)",
            fontSize: "11px",
            letterSpacing: "3px",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          SKILLS • PRACTICE • PLACEMENTS
        </div>
      </div>

      {/* Feature Breakdown / Quick Start Section */}
      <div style={{ padding: "48px 48px 64px", background: "#060505", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div className="font-display" style={{ color: "#FF2A1F", fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                Targeted Placement Engineering
              </div>
              <h2 className="font-display" style={{ fontSize: "36px", color: "#F1EDE3", fontWeight: 700, letterSpacing: "1px" }}>
                WHY COMPASS WORKS
              </h2>
            </div>
            <Link to="/plan" className="btn-red" style={{ padding: "12px 24px" }}>
              Start Your Plan →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            <div className="card-panel" style={{ background: "#0F0D0B", borderColor: "#221E1A" }}>
              <div className="font-display" style={{ fontSize: "28px", color: "#FF2A1F", fontWeight: 700, marginBottom: "8px" }}>01</div>
              <h3 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3", marginBottom: "10px" }}>The Probe Ladder</h3>
              <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.6 }}>
                Every question runs through 5 strict steps: Recognize → Hinted recall → Apply → Explain → Transfer. Finds the exact moment you break.
              </p>
            </div>

            <div className="card-panel" style={{ background: "#0F0D0B", borderColor: "#221E1A" }}>
              <div className="font-display" style={{ fontSize: "28px", color: "#FF2A1F", fontWeight: 700, marginBottom: "8px" }}>02</div>
              <h3 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3", marginBottom: "10px" }}>In-Browser Code Judge</h3>
              <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.6 }}>
                Judged by Pyodide (Python) and sql.js (SQL) running hidden unit tests. AI never guesses whether code is right or wrong.
              </p>
            </div>

            <div className="card-panel" style={{ background: "#0F0D0B", borderColor: "#221E1A" }}>
              <div className="font-display" style={{ fontSize: "28px", color: "#FF2A1F", fontWeight: 700, marginBottom: "8px" }}>03</div>
              <h3 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3", marginBottom: "10px" }}>Proof-Based Readiness</h3>
              <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.6 }}>
                No fake percentages. Every green cell links to your actual code execution or fuzzy quote match verified against strict rubrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
