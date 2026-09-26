import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

export function PlanScreen() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState<string>("co_zoho");
  const [timeAvailable, setTimeAvailable] = useState<string>("4 Weeks");
  const [level, setLevel] = useState<string>("Intermediate");
  const [activePlanCard, setActivePlanCard] = useState<number>(0);

  const handleGeneratePlan = async () => {
    await api.createStudent({
      name: "Student",
      companyId: selectedCompany,
      driveDate: "2026-11-10",
      hoursPerDay: timeAvailable === "1 Week" ? 4 : 2,
      scope: "two-week",
    });
    alert("New personalized roadmap generated!");
  };

  const handleStartTask = () => {
    navigate("/practice");
  };

  const planTracks = [
    { num: "01", name: "Aptitude", duration: "2 weeks", active: activePlanCard === 0 },
    { num: "02", name: "Coding", duration: "3 weeks", active: activePlanCard === 1 },
    { num: "03", name: "DSA", duration: "4 weeks", active: activePlanCard === 2 },
    { num: "04", name: "System Design", duration: "2 weeks", active: activePlanCard === 3 },
    { num: "05", name: "HR Preparation", duration: "1 week", active: activePlanCard === 4 },
  ];

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      {/* Subheader */}
      <div className="sub-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>
        {/* Top Grid: Left Heading + Target Drive, Right Hero Image + Form */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.1fr) minmax(400px, 1.9fr)", gap: "40px", alignItems: "start", marginBottom: "48px" }}>
          
          {/* Left Column: Heading + Description + Target Drive Card */}
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(42px, 5vw, 68px)",
                lineHeight: 1.0,
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              YOUR PLACEMENT<br />
              <span style={{ color: "#FF2A1F" }}>ROADMAP</span>
            </h1>

            <p style={{ color: "#9E998F", fontSize: "15px", lineHeight: 1.5, marginBottom: "36px", maxWidth: "440px" }}>
              A personalized plan to help you prepare, practice and prove your skills.
            </p>

            {/* Target Drive Card */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#26221E",
                borderRadius: "10px",
                padding: "24px",
                maxWidth: "400px",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#8E8A82", fontSize: "13px", marginBottom: "16px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Target Drive</span>
              </div>

              <div style={{ color: "#77736B", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                Next Drive
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="font-display" style={{ fontSize: "32px", fontWeight: 700, color: "#F1EDE3", letterSpacing: "0.5px" }}>
                    TCS NQT
                  </div>
                  <div style={{ color: "#8E8A82", fontSize: "13px", marginTop: "4px" }}>
                    10 Nov 2026
                  </div>
                </div>

                <button
                  onClick={handleStartTask}
                  style={{
                    background: "#1E1B17",
                    border: "1px solid #332E27",
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F1EDE3",
                    fontSize: "20px",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FF2A1F";
                    e.currentTarget.style.borderColor = "#FF2A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#1E1B17";
                    e.currentTarget.style.borderColor = "#332E27";
                  }}
                  title="Start Today's Task"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image with Annotation + Preparation Plan Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Upper Hero Image + Handwritten Note */}
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
                  top: "28px",
                  color: "#FFFFFF",
                  fontSize: "30px",
                  fontWeight: 700,
                  textAlign: "right",
                  lineHeight: 1.1,
                  textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                }}
              >
                PLAN TODAY.<br />
                A BETTER<br />
                TOMORROW.
              </div>
            </div>

            {/* Preparation Plan Form Card */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#26221E",
                borderRadius: "12px",
                padding: "28px 32px",
              }}
            >
              <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 600, color: "#F1EDE3", marginBottom: "6px" }}>
                Preparation Plan
              </h3>
              <p style={{ color: "#8E8A82", fontSize: "14px", marginBottom: "24px" }}>
                Customize your plan based on the company and your current level.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr)) auto", gap: "16px", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Company</label>
                  <select
                    className="select-dark"
                    style={{ width: "100%" }}
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="co_tcs">TCS NQT</option>
                    <option value="co_zoho">Zoho</option>
                    <option value="co_amazon">Amazon</option>
                    <option value="co_infosys">Infosys</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Time Available</label>
                  <select
                    className="select-dark"
                    style={{ width: "100%" }}
                    value={timeAvailable}
                    onChange={(e) => setTimeAvailable(e.target.value)}
                  >
                    <option value="4 Weeks">4 Weeks</option>
                    <option value="2 Weeks">2 Weeks</option>
                    <option value="6 Days">6 Days</option>
                    <option value="1 Week">1 Week</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Current Level</label>
                  <select
                    className="select-dark"
                    style={{ width: "100%" }}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="Intermediate">Intermediate</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleGeneratePlan}
                    className="btn-red"
                    style={{ height: "40px", padding: "0 22px", borderRadius: "6px" }}
                  >
                    Generate Plan →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Your Plan */}
        <div>
          <h2 className="font-display" style={{ fontSize: "24px", color: "#F1EDE3", fontWeight: 700, marginBottom: "20px" }}>
            Your Plan
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {planTracks.map((item, index) => (
              <div
                key={item.num}
                onClick={() => setActivePlanCard(index)}
                style={{
                  background: item.active ? "rgba(255, 42, 31, 0.04)" : "#13110E",
                  border: item.active ? "1px solid #FF2A1F" : "1px solid #221E1A",
                  borderRadius: "10px",
                  padding: "20px 24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  transition: "all 150ms ease",
                }}
              >
                <div
                  className="font-display"
                  style={{
                    background: item.active ? "rgba(255, 42, 31, 0.15)" : "#1A1714",
                    border: item.active ? "1px solid rgba(255, 42, 31, 0.4)" : "1px solid #2B2620",
                    color: item.active ? "#FF2A1F" : "#8E8A82",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {item.num}
                </div>
                <div>
                  <div
                    className="font-display"
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: item.active ? "#FF2A1F" : "#F1EDE3",
                      marginBottom: "4px",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ color: "#77736B", fontSize: "13px" }}>
                    {item.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
