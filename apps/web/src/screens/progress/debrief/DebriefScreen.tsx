import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

export function DebriefScreen() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Zoho");
  const [roundName, setRoundName] = useState("Technical Round 1");
  const [questions, setQuestions] = useState([{ question: "Explain graph traversal and shortest path", answer: "I answered BFS but missed visited set" }]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, { question: "", answer: "" }]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await api.saveDebrief({
      studentId: "st_demo",
      companyId: "co_zoho",
      roundName,
      date: new Date().toISOString().slice(0, 10),
      items: questions,
    });
    setSubmitting(false);
    if (res.ok) {
      alert("Debrief logged! New gap added to your plan.");
      navigate("/plan");
    }
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", padding: "0 0 64px" }}>
      <div className="sub-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 className="font-display" style={{ fontSize: "40px", fontWeight: 700, marginBottom: "8px" }}>
            ROUND <span style={{ color: "#FF2A1F" }}>DEBRIEF</span>
          </h1>
          <p style={{ color: "#9E998F", fontSize: "14px" }}>
            Turn real interview questions and rejections into actionable gap diagnosis and targeted drills before your next drive.
          </p>
        </div>

        <div className="card-panel" style={{ background: "#12100E", borderColor: "#221E1A", borderRadius: "10px", padding: "28px", marginBottom: "28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Company</label>
              <input className="input-dark" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Round</label>
              <input className="input-dark" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
            {questions.map((q, idx) => (
              <div key={idx} style={{ background: "#181512", border: "1px solid #24201C", padding: "18px", borderRadius: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FF2A1F", marginBottom: "10px" }}>
                  Question {idx + 1}
                </div>
                <input
                  className="input-dark"
                  placeholder="Question they asked..."
                  value={q.question}
                  onChange={(e) => {
                    const copy = [...questions];
                    copy[idx]!.question = e.target.value;
                    setQuestions(copy);
                  }}
                  style={{ marginBottom: "10px" }}
                />
                <textarea
                  className="input-dark"
                  rows={3}
                  placeholder="What you answered..."
                  value={q.answer}
                  onChange={(e) => {
                    const copy = [...questions];
                    copy[idx]!.answer = e.target.value;
                    setQuestions(copy);
                  }}
                />
              </div>
            ))}
          </div>

          <button onClick={handleAddQuestion} className="btn-dark" style={{ width: "100%", padding: "10px", marginBottom: "20px" }}>
            + Add Another Question
          </button>

          <button onClick={handleSubmit} disabled={submitting} className="btn-red" style={{ width: "100%", padding: "12px" }}>
            {submitting ? "Analyzing and finding gaps…" : "Find My Gaps & Add to Plan →"}
          </button>
        </div>
      </div>
    </div>
  );
}
