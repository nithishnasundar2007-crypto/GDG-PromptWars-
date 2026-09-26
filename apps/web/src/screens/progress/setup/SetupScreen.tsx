import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import { verifyRunnerLoads, type RunnerLoadStatus } from "../../../lib/api/runnerDiagnostics";

type RunnerStatus = "checking" | "ready" | "failed";

export function SetupScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RunnerStatus>("checking");
  const [detail, setDetail] = useState<RunnerLoadStatus | null>(null);
  const [companyId, setCompanyId] = useState("co_zoho");
  const [hours, setHours] = useState(3);
  const [name, setName] = useState("Suchit");

  useEffect(() => {
    let cancelled = false;
    void api.initRunner();
    void verifyRunnerLoads().then((result) => {
      if (cancelled) return;
      setDetail(result);
      setStatus(result.pyodide && result.sqlJs ? "ready" : "failed");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBuildPlan = async () => {
    await api.createStudent({
      name,
      companyId,
      driveDate: "2026-11-10",
      hoursPerDay: hours,
      scope: "two-week",
    });
    navigate("/plan");
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      <div className="sub-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: "680px", margin: "40px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1 className="font-display" style={{ fontSize: "44px", fontWeight: 700, marginBottom: "12px" }}>
            START YOUR <span style={{ color: "#FF2A1F" }}>PREPARATION</span>
          </h1>
          <p style={{ color: "#9E998F", fontSize: "15px" }}>
            Configure your target company drive in under 30 seconds.
          </p>
        </div>

        <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "12px", padding: "36px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#8E8A82", marginBottom: "8px" }}>Target Company</label>
            <select className="select-dark" value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={{ width: "100%" }}>
              <option value="co_zoho">Zoho</option>
              <option value="co_tcs">TCS NQT</option>
              <option value="co_amazon">Amazon</option>
              <option value="co_infosys">Infosys</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#8E8A82", marginBottom: "8px" }}>Your Name (Optional)</label>
            <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#8E8A82", marginBottom: "8px" }}>Hours Per Day: {hours} hrs</label>
            <input
              type="range"
              min="1"
              max="8"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#FF2A1F" }}
            />
          </div>

          <div style={{ background: "#181512", padding: "12px 16px", borderRadius: "6px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#8E8A82" }}>Code Runner Status:</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: status === "ready" ? "#10B981" : "#F59E0B" }}>
              {status === "checking" && "getting ready…"}
              {status === "ready" && "● ready (in-browser Pyodide & SQL)"}
              {status === "failed" && "load issue (using fallback)"}
            </span>
          </div>

          {detail && (
            <div style={{ display: "none" }}>{JSON.stringify(detail)}</div>
          )}

          <button onClick={handleBuildPlan} className="btn-red" style={{ width: "100%", padding: "14px", fontSize: "15px" }}>
            Build My Plan →
          </button>
        </div>
      </div>
    </div>
  );
}
