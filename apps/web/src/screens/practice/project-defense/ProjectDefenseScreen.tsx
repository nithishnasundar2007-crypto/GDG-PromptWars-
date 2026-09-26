import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import type { ProjectCardItem, ProjectQuestion } from "../../../contracts/types";

export function ProjectDefenseScreen() {
  const [activeMode, setActiveMode] = useState<"hub" | "mock" | "common" | "hr">("hub");
  const [projectText] = useState(
    "A distributed chat and notification platform built with Node.js, WebSockets, PostgreSQL, and Redis caching. Handles 10,000 active concurrent connections."
  );
  const [questions, setQuestions] = useState<ProjectQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<Record<string, ProjectCardItem>>({});

  const handleStartMock = async () => {
    setActiveMode("mock");
    const res = await api.generateProjectQuestions(projectText);
    if (res.ok) {
      setQuestions(res.data);
      setCurrentQIndex(0);
    }
  };

  const handleGradeCurrent = async () => {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;
    setGrading(true);
    const res = await api.gradeProjectAnswer(currentQ, projectText, studentAnswer);
    setGrading(false);
    if (res.ok) {
      setResults((prev) => ({ ...prev, [currentQ.id]: res.data.card }));
    }
  };

  const currentQ = questions[currentQIndex];
  const currentCard = currentQ ? results[currentQ.id] : undefined;

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      {/* Subheader */}
      <div className="sub-nav">
        {activeMode === "hub" ? (
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
        ) : (
          <button onClick={() => setActiveMode("hub")} className="back-link" style={{ background: "none", border: "none", cursor: "pointer" }}>
            ← Back to Defense Hub
          </button>
        )}
      </div>

      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>
        {/* Top Hero Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "40px", alignItems: "start", marginBottom: "48px" }}>
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
              DEFENSE.<br />
              <span style={{ color: "#FF2A1F" }}>BE CONFIDENT.</span>
            </h1>

            <p style={{ color: "#9E998F", fontSize: "15px", lineHeight: 1.5, maxWidth: "440px" }}>
              Prepare for interviews with mock sessions, common questions and AI feedback.
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
              PRACTICE <br />
              THE CONVERSATION. <br />
              OWN THE INTERVIEW.
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: DEFENSE HUB (07_defense_interview_prep.png)           */}
        {/* ------------------------------------------------------------- */}
        {activeMode === "hub" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            
            {/* Card 1: Mock Interview */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#221E1A",
                borderRadius: "12px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "260px",
              }}
            >
              <div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "rgba(255, 42, 31, 0.12)",
                    border: "1px solid rgba(255, 42, 31, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF2A1F",
                    marginBottom: "20px",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>

                <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 700, color: "#F1EDE3", marginBottom: "8px" }}>
                  Mock Interview
                </h3>
                <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.5 }}>
                  AI powered mock interviews with real time feedback.
                </p>
              </div>

              <button
                onClick={handleStartMock}
                className="btn-red"
                style={{ width: "fit-content", padding: "10px 20px" }}
              >
                Start Mock →
              </button>
            </div>

            {/* Card 2: Common Questions */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#221E1A",
                borderRadius: "12px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "260px",
              }}
            >
              <div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "rgba(255, 42, 31, 0.12)",
                    border: "1px solid rgba(255, 42, 31, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF2A1F",
                    marginBottom: "20px",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>

                <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 700, color: "#F1EDE3", marginBottom: "8px" }}>
                  Common Questions
                </h3>
                <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.5 }}>
                  Company specific question bank and model answers.
                </p>
              </div>

              <button
                onClick={() => setActiveMode("common")}
                className="btn-dark"
                style={{ width: "fit-content", padding: "10px 24px" }}
              >
                Explore →
              </button>
            </div>

            {/* Card 3: Behavioral Prep */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#221E1A",
                borderRadius: "12px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "260px",
              }}
            >
              <div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "rgba(255, 42, 31, 0.12)",
                    border: "1px solid rgba(255, 42, 31, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF2A1F",
                    marginBottom: "20px",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>

                <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 700, color: "#F1EDE3", marginBottom: "8px" }}>
                  Behavioral Prep
                </h3>
                <p style={{ color: "#9E998F", fontSize: "14px", lineHeight: 1.5 }}>
                  Prepare for HR questions with structured guidance.
                </p>
              </div>

              <button
                onClick={() => setActiveMode("hr")}
                className="btn-red"
                style={{ width: "fit-content", padding: "10px 20px" }}
              >
                Start Prep →
              </button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 2: INTERACTIVE DEFENSE MOCK SESSION                      */
          /* ------------------------------------------------------------- */
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "28px" }}>
            <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span className="font-display" style={{ fontSize: "18px", color: "#FF2A1F" }}>
                  Question {currentQIndex + 1} of {questions.length || 6}
                </span>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#8E8A82" }}>
                  Area: {currentQ?.area || "architecture"}
                </span>
              </div>

              <h2 className="font-display" style={{ fontSize: "22px", color: "#F1EDE3", marginBottom: "20px" }}>
                {currentQ?.text || "Why this database over the alternatives?"}
              </h2>

              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "8px" }}>
                Your Answer (Explain like in an interview):
              </label>
              <textarea
                className="input-dark"
                rows={6}
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="We considered MongoDB for flexible schema, but picked PostgreSQL because our relational data model requires ACID transactions..."
                style={{ marginBottom: "20px", resize: "vertical" }}
              />

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleGradeCurrent}
                  disabled={grading || !studentAnswer.trim()}
                  className="btn-red"
                  style={{ flex: 1 }}
                >
                  {grading ? "Evaluating with Verifier…" : "Submit Answer"}
                </button>
                {currentQIndex < (questions.length - 1) && (
                  <button
                    onClick={() => {
                      setCurrentQIndex((prev) => prev + 1);
                      setStudentAnswer("");
                    }}
                    className="btn-dark"
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>

            {/* Defense Assessment Card */}
            <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "28px" }}>
              <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "16px" }}>
                Defense Evaluation Card
              </h3>

              {currentCard ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: currentCard.strong ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: currentCard.strong ? "#10B981" : "#EF4444",
                        border: `1px solid ${currentCard.strong ? "#10B981" : "#EF4444"}`,
                      }}
                    >
                      {currentCard.strong ? "STRONG DEFENSE" : "WEAK ANSWER"}
                    </span>
                  </div>

                  {currentCard.missing.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Missing reasoning:</div>
                      {currentCard.missing.map((m, i) => (
                        <div key={i} style={{ color: "#F87171", fontSize: "13px", marginBottom: "4px" }}>
                          • {m}
                        </div>
                      ))}
                    </div>
                  )}

                  {currentCard.modelOutline && (
                    <div style={{ background: "#181512", border: "1px solid #282420", borderRadius: "6px", padding: "14px", marginTop: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#8E8A82", marginBottom: "4px" }}>Model Outline:</div>
                      <div style={{ fontSize: "13px", color: "#E8E1D5", lineHeight: 1.5 }}>
                        {currentCard.modelOutline}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#77736B", fontSize: "14px", textAlign: "center", padding: "40px 0" }}>
                  Submit an answer to receive proof-based verification and rubric feedback.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
