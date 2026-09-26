import { useState } from "react";
import { Link } from "react-router-dom";

export function ProfileSettingsScreen() {
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "companies" | "notifications" | "privacy">("profile");

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
              PROFILE <br />
              <span style={{ color: "#FF2A1F" }}>& SETTINGS.</span>
            </h1>

            <p style={{ color: "#9E998F", fontSize: "15px", lineHeight: 1.5, maxWidth: "440px" }}>
              Manage your profile, preferences and preparation goals.
            </p>
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
              BIGGER <br />
              SKILLS <br />
              BRIGHTER <br />
              TOMORROW.
            </div>
          </div>
        </div>

        {/* Content Section: Sidebar + Details Card */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "28px" }}>
          
          {/* Sidebar Menu */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "preferences", label: "Preferences", icon: "⚙️" },
              { id: "companies", label: "Target Companies", icon: "🏢" },
              { id: "notifications", label: "Notifications", icon: "🔔" },
              { id: "privacy", label: "Privacy", icon: "🔒" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as "profile" | "preferences" | "companies" | "notifications" | "privacy")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  background: activeTab === item.id ? "#FF2A1F" : "#12100E",
                  color: activeTab === item.id ? "#FFFFFF" : "#8E8A82",
                  border: "1px solid",
                  borderColor: activeTab === item.id ? "#FF2A1F" : "#221E1A",
                  fontSize: "14px",
                  fontWeight: activeTab === item.id ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 150ms ease",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Details Card: Profile Information */}
          <div
            className="card-panel"
            style={{
              background: "#12100E",
              borderColor: "#221E1A",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <h2 className="font-display" style={{ fontSize: "20px", color: "#F1EDE3", marginBottom: "24px" }}>
              Profile Information
            </h2>

            {/* Avatar & User Details */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "24px", borderBottom: "1px solid #1E1B17", marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#221E1A",
                    border: "1px solid #332E27",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#F1EDE3",
                  }}
                >
                  S
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 600, color: "#F1EDE3" }}>
                    Suchit Sachin Chopade
                  </div>
                  <div style={{ fontSize: "13px", color: "#8E8A82", marginTop: "2px" }}>
                    suchit@example.com
                  </div>
                </div>
              </div>

              <button className="btn-dark" style={{ padding: "6px 18px", fontSize: "13px" }}>
                Edit
              </button>
            </div>

            {/* Grid of Profile Information Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px 40px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Current Year
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  2nd Year
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Branch
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  AI & DS
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Target Companies
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  TCS, Infosys, Zoho
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Preparation Timeline
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  4 Months
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Current Level
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  Intermediate
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#6E6960", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  Primary Language
                </div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F1EDE3" }}>
                  Python & SQL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
