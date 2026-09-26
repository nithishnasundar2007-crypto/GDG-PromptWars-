import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import type { Drill } from "../../../contracts/types";

export function DrillScreen() {
  const { gapId } = useParams<{ gapId: string }>();
  const navigate = useNavigate();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await api.getDrill(gapId || "gap_apply");
      if (res.ok) {
        setDrill(res.data);
      }
    }
    void load();
  }, [gapId]);

  const handleFinish = async () => {
    setCompleted(true);
    await api.completePlanItem("pi_1", "done");
    setTimeout(() => {
      navigate("/practice");
    }, 1200);
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      <div className="sub-nav">
        <Link to="/plan" className="back-link">
          ← Back to Plan
        </Link>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", color: "#FF2A1F", textTransform: "uppercase", fontWeight: 600, letterSpacing: "1px", marginBottom: "8px" }}>
            Targeted Fix • {drill?.kind || "debug"} drill
          </div>
          <h1 className="font-display" style={{ fontSize: "36px", fontWeight: 700, marginBottom: "8px" }}>
            {drill?.title || "Targeted Drill Session"}
          </h1>
          <p style={{ color: "#9E998F", fontSize: "14px" }}>
            Estimated time: {drill?.minutes || 15} minutes • Focus: Fix this specific failure pattern before re-testing.
          </p>
        </div>

        <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "28px", marginBottom: "28px" }}>
          <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "14px" }}>
            Drill Instructions
          </h3>
          <div className="mono" style={{ background: "#0B0908", padding: "18px", borderRadius: "8px", border: "1px solid #1C1916", color: "#E8E1D5", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {drill?.content || "Review the off-by-one condition in your BFS queue tracking."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px" }}>
          <button onClick={() => navigate("/practice")} className="btn-dark">
            Back to Practice
          </button>
          <button onClick={handleFinish} className="btn-red">
            {completed ? "Completed! Heading to Re-test…" : "I'm ready for the re-test →"}
          </button>
        </div>
      </div>
    </div>
  );
}
