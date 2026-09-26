import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import type { CellEvidence, CellState, ReadinessMap, StepId } from "../../../contracts/types";

export function ReadinessMapScreen() {
  const navigate = useNavigate();
  const [readinessData, setReadinessData] = useState<ReadinessMap | null>(null);
  const [activeCellEvidence, setActiveCellEvidence] = useState<CellEvidence | null>(null);
  const [viewMode, setViewMode] = useState<"analytics" | "matrix">("analytics");

  useEffect(() => {
    async function loadMap() {
      const res = await api.getReadinessMap("st_demo");
      if (res.ok) {
        setReadinessData(res.data);
      }
    }
    void loadMap();
  }, []);

  const handleCellClick = async (topicId: string, step: StepId) => {
    const res = await api.getCellEvidence("st_demo", topicId, step);
    if (res.ok) {
      setActiveCellEvidence(res.data);
    }
  };

  const handlePractise = async (topicId: string, step: StepId) => {
    const ladderRes = await api.startLadder("st_demo", topicId, "probe", step);
    if (ladderRes.ok) {
      navigate(`/probe/${ladderRes.data.ladder.id}`);
    } else {
      navigate("/practice");
    }
  };

  const getCellColor = (state: CellState) => {
    switch (state) {
      case "green":
        return { bg: "rgba(16, 185, 129, 0.15)", border: "#10B981", text: "#34D399", label: "Proven" };
      case "amber":
        return { bg: "rgba(245, 158, 11, 0.15)", border: "#F59E0B", text: "#FBBF24", label: "Suspected" };
      case "red":
        return { bg: "rgba(239, 68, 68, 0.15)", border: "#EF4444", text: "#F87171", label: "Gap" };
      case "grey":
      default:
        return { bg: "#181512", border: "#2A2621", text: "#77736B", label: "Untested" };
    }
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      {/* Subheader */}
      <div className="sub-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>
        {/* Top Hero Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "40px", alignItems: "start", marginBottom: "40px" }}>
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(44px, 5.5vw, 68px)",
                lineHeight: 1.0,
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              READINESS<br />
              <span style={{ color: "#FF2A1F" }}>MAP.</span>
            </h1>

            <p style={{ color: "#9E998F", fontSize: "15px", lineHeight: 1.5, maxWidth: "440px" }}>
              Track your progress across all skills and identify the gaps.
            </p>

            {/* Toggle between Analytics and Detailed Proof Matrix */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                onClick={() => setViewMode("analytics")}
                style={{
                  background: viewMode === "analytics" ? "#FF2A1F" : "#1A1714",
                  color: "#FFFFFF",
                  border: "1px solid",
                  borderColor: viewMode === "analytics" ? "#FF2A1F" : "#2E2822",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Analytics Overview
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                style={{
                  background: viewMode === "matrix" ? "#FF2A1F" : "#1A1714",
                  color: "#FFFFFF",
                  border: "1px solid",
                  borderColor: viewMode === "matrix" ? "#FF2A1F" : "#2E2822",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Proof Matrix (Compass Engine)
              </button>
            </div>
          </div>

          {/* Right Hero Image + Handwritten Note */}
          <div
            style={{
              position: "relative",
              height: "220px",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundImage: "url('/assets/landing-hero.png')",
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              border: "1px solid #221E1A",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to right, rgba(8,7,6,0.7) 0%, rgba(8,7,6,0.2) 60%, rgba(8,7,6,0.6) 100%)",
              }}
            />
            <div
              className="font-hand"
              style={{
                position: "absolute",
                right: "32px",
                top: "32px",
                color: "#FFFFFF",
                fontSize: "28px",
                fontWeight: 700,
                textAlign: "right",
                lineHeight: 1.15,
                textShadow: "0 2px 10px rgba(0,0,0,0.9)",
              }}
            >
              MEASURE.<br />
              IMPROVE.<br />
              BE READY.
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW MODE 1: ANALYTICS OVERVIEW (06_readiness_analysis.png)   */}
        {/* ------------------------------------------------------------- */}
        {viewMode === "analytics" ? (
          <div>
            {/* Top Cards: Circular Gauge + Skill Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "24px" }}>
              
              {/* Overall Readiness Circular Gauge */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="66" stroke="#221E1A" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      stroke="#34D399"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray="414"
                      strokeDashoffset="116"
                      strokeLinecap="round"
                      transform="rotate(-90 80 80)"
                    />
                  </svg>
                  <div style={{ position: "absolute", textAlign: "center" }}>
                    <div className="font-display" style={{ fontSize: "40px", fontWeight: 700, color: "#F1EDE3", lineHeight: 1 }}>
                      72%
                    </div>
                  </div>
                </div>

                <div style={{ color: "#8E8A82", fontSize: "14px", fontWeight: 500 }}>
                  Overall Readiness
                </div>
              </div>

              {/* Skill Breakdown */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "28px 32px",
                }}
              >
                <h3 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3", marginBottom: "24px" }}>
                  Skill Breakdown
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {[
                    { label: "Aptitude", pct: 85, color: "#34D399" },
                    { label: "Coding", pct: 70, color: "#FBBF24" },
                    { label: "DSA", pct: 60, color: "#F59E0B" },
                    { label: "System Design", pct: 45, color: "#EF4444" },
                    { label: "HR Preparation", pct: 75, color: "#34D399" },
                  ].map((skill) => (
                    <div key={skill.label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 50px", alignItems: "center", gap: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#F1EDE3", fontSize: "14px" }}>
                        <span style={{ color: "#77736B", fontSize: "10px" }}>▷</span>
                        <span>{skill.label}</span>
                      </div>
                      <div style={{ height: "8px", background: "#1C1916", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${skill.pct}%`,
                            backgroundColor: skill.color,
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                      <div style={{ color: "#8E8A82", fontSize: "13px", textAlign: "right" }}>
                        {skill.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Cards: Strengths & Areas to Improve */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              
              {/* Strengths */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "24px 28px",
                }}
              >
                <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "18px" }}>
                  Strengths
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[
                    "Good at Arrays and Strings",
                    "Consistent practice (last 14 days)",
                    "Strong problem solving speed",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#C8C4BC", fontSize: "14px" }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                        ✓
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas to Improve */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "24px 28px",
                }}
              >
                <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "18px" }}>
                  Areas to Improve
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[
                    "System Design fundamentals",
                    "Tree and Graphs",
                    "Mock interviews practice",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#C8C4BC", fontSize: "14px" }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                        ✕
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW MODE 2: PROOF MATRIX (COMPASS ENGINE DATA)               */
          /* ------------------------------------------------------------- */
          <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3" }}>
                Technical Proof Matrix
              </h3>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                <span style={{ color: "#34D399" }}>● Proven (Pass)</span>
                <span style={{ color: "#FBBF24" }}>● Suspected Gap</span>
                <span style={{ color: "#F87171" }}>● Confirmed Gap</span>
                <span style={{ color: "#77736B" }}>● Not Tested</span>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #221E1A" }}>
                    <th style={{ padding: "12px 16px", color: "#8E8A82", fontSize: "12px", textTransform: "uppercase" }}>Topic</th>
                    <th style={{ padding: "12px 16px", color: "#8E8A82", fontSize: "12px", textTransform: "uppercase" }}>Recognize</th>
                    <th style={{ padding: "12px 16px", color: "#8E8A82", fontSize: "12px", textTransform: "uppercase" }}>Apply</th>
                    <th style={{ padding: "12px 16px", color: "#8E8A82", fontSize: "12px", textTransform: "uppercase" }}>Explain</th>
                    <th style={{ padding: "12px 16px", color: "#8E8A82", fontSize: "12px", textTransform: "uppercase" }}>Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {readinessData?.technical.map((row) => (
                    <tr key={row.topic.id} style={{ borderBottom: "1px solid #1C1916" }}>
                      <td style={{ padding: "16px", fontWeight: 600, color: "#F1EDE3" }}>
                        {row.topic.name} <span style={{ color: "#77736B", fontSize: "12px", marginLeft: "6px" }}>{"•".repeat(row.weight)}</span>
                      </td>
                      {(["recognize", "apply", "explain", "transfer"] as Exclude<StepId, "hint">[]).map((step) => {
                        const cell = row.cells[step];
                        const style = getCellColor(cell?.state || "grey");
                        return (
                          <td key={step} style={{ padding: "12px 16px" }}>
                            <button
                              onClick={() => handleCellClick(row.topic.id, step)}
                              style={{
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                                color: style.text,
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              {style.label}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evidence Drawer Modal */}
        {activeCellEvidence && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "480px",
              maxWidth: "100vw",
              background: "#14120F",
              borderLeft: "1px solid #282420",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.8)",
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              padding: "32px",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 className="font-display" style={{ fontSize: "22px", color: "#F1EDE3" }}>
                Cell Proof & Evidence
              </h3>
              <button
                onClick={() => setActiveCellEvidence(null)}
                style={{ color: "#8E8A82", fontSize: "20px", cursor: "pointer", background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "#8E8A82", fontSize: "12px", textTransform: "uppercase", marginBottom: "4px" }}>
                Step: <strong style={{ color: "#FF2A1F" }}>{activeCellEvidence.cell.step}</strong>
              </div>
              <div style={{ fontSize: "14px", color: "#C8C4BC" }}>
                Recorded attempt status: <strong style={{ color: "#FBBF24" }}>{activeCellEvidence.cell.state}</strong>
              </div>
            </div>

            {activeCellEvidence.attempts.map((att, i) => (
              <div key={i} style={{ background: "#1C1916", border: "1px solid #2A2520", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#F1EDE3", marginBottom: "8px" }}>
                  Question: {att.question.prompt}
                </div>
                <div style={{ fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>
                  Student Answer:
                </div>
                <div className="mono" style={{ fontSize: "12px", background: "#100E0C", padding: "10px", borderRadius: "4px", color: "#34D399", whiteSpace: "pre-wrap" }}>
                  {att.answer}
                </div>
              </div>
            ))}

            <button
              onClick={() => handlePractise(activeCellEvidence.cell.topicId, activeCellEvidence.cell.step as StepId)}
              className="btn-red"
              style={{ marginTop: "auto", width: "100%", padding: "12px" }}
            >
              Practise this Gap →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
