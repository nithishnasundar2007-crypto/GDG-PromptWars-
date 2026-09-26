import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import type { Company, Topic } from "../../../contracts/types";

export function RoundMapScreen() {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    async function load() {
      const res = await api.getRoundMap("co_zoho");
      if (res.ok) {
        setCompany(res.data.company);
        setTopics(res.data.topics);
      }
    }
    void load();
  }, []);

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      <div className="sub-nav">
        <Link to="/plan" className="back-link">
          ← Back to Plan
        </Link>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 className="font-display" style={{ fontSize: "44px", fontWeight: 700, marginBottom: "12px" }}>
            {company?.name || "Zoho"} <span style={{ color: "#FF2A1F" }}>ROUND MAP</span>
          </h1>
          <p style={{ color: "#9E998F", fontSize: "15px" }}>
            Structured view of hiring rounds and tested topics based on past interview patterns.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          {company?.rounds.map((round) => (
            <div key={round.id} className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "24px" }}>
              <div style={{ fontSize: "12px", color: "#FF2A1F", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
                Round {round.order}
              </div>
              <h2 className="font-display" style={{ fontSize: "24px", color: "#F1EDE3", marginBottom: "16px" }}>
                {round.name}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {round.topics.map((t) => {
                  const topicMeta = topics.find((item) => item.id === t.topicId);
                  return (
                    <div key={t.topicId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#181512", padding: "10px 14px", borderRadius: "6px" }}>
                      <span style={{ fontSize: "14px", color: "#E8E1D5" }}>{topicMeta?.name || t.topicId}</span>
                      <span style={{ color: "#FF2A1F", fontSize: "14px", letterSpacing: "2px" }}>
                        {"●".repeat(t.weight)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1C1916", paddingTop: "24px" }}>
          <span style={{ color: "#635E55", fontSize: "13px" }}>
            * Based on verified campus drive history and past student debriefs
          </span>
          <button onClick={() => navigate("/plan")} className="btn-red" style={{ padding: "10px 24px" }}>
            See My Plan →
          </button>
        </div>
      </div>
    </div>
  );
}
