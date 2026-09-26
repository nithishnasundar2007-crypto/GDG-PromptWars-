import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

interface QuestionItem {
  num: string;
  id: string;
  title: string;
  topic: string;
  topicId: string;
  difficulty: "Easy" | "Medium" | "Hard";
  company: string;
}

const QUESTIONS: QuestionItem[] = [
  { num: "01", id: "q_two_sum", title: "Two Sum", topic: "Arrays", topicId: "tp_graphs", difficulty: "Easy", company: "Amazon" },
  { num: "02", id: "q_buy_sell_stock", title: "Best Time to Buy and Sell Stock", topic: "Arrays", topicId: "tp_graphs", difficulty: "Medium", company: "TCS" },
  { num: "03", id: "q_product_array", title: "Product of Array Except Self", topic: "Arrays", topicId: "tp_graphs", difficulty: "Medium", company: "Google" },
  { num: "04", id: "q_max_subarray", title: "Maximum Subarray", topic: "Arrays", topicId: "tp_graphs", difficulty: "Medium", company: "Microsoft" },
  { num: "05", id: "q_merge_intervals", title: "Merge Intervals", topic: "Arrays", topicId: "tp_graphs", difficulty: "Hard", company: "Amazon" },
];

export function ProbePracticeScreen() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("Arrays");
  const [difficulty, setDifficulty] = useState("Medium");
  const [company, setCompany] = useState("All");
  const [loadingLadder, setLoadingLadder] = useState(false);

  const handleStartSolve = async (item: QuestionItem) => {
    setLoadingLadder(true);
    const ladderRes = await api.startLadder("st_demo", item.topicId, "probe");
    setLoadingLadder(false);
    if (ladderRes.ok) {
      navigate(`/probe/${ladderRes.data.ladder.id}`, { state: { questionTitle: item.title, questionCompany: item.company, questionDifficulty: item.difficulty } });
    } else {
      navigate(`/probe/ld_demo`, { state: { questionTitle: item.title, questionCompany: item.company, questionDifficulty: item.difficulty } });
    }
  };

  const filteredQuestions = QUESTIONS.filter((q) => {
    if (difficulty !== "All" && q.difficulty !== difficulty && difficulty !== "Medium") return true;
    if (company !== "All" && q.company !== company) return true;
    return true;
  });

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
              PROBE.<br />
              PRACTICE.<br />
              <span style={{ color: "#FF2A1F" }}>IMPROVE.</span>
            </h1>

            <p style={{ color: "#9E998F", fontSize: "15px", lineHeight: 1.5, maxWidth: "440px" }}>
              Solve questions, get instant feedback and track your progress.
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
              SAME<br />
              QUESTIONS<br />
              STRONGER<br />
              YOU.
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div
          className="card-panel"
          style={{
            background: "#12100E",
            borderColor: "#26221E",
            borderRadius: "12px",
            padding: "20px 28px",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) auto", gap: "20px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Topic</label>
              <select
                className="select-dark"
                style={{ width: "100%" }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="Arrays">Arrays</option>
                <option value="Graphs">Graphs</option>
                <option value="SQL">SQL Joins</option>
                <option value="Dynamic Programming">Dynamic Programming</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Difficulty</label>
              <select
                className="select-dark"
                style={{ width: "100%" }}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#8E8A82", marginBottom: "6px" }}>Companies</label>
              <select
                className="select-dark"
                style={{ width: "100%" }}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Amazon">Amazon</option>
                <option value="TCS">TCS</option>
                <option value="Google">Google</option>
                <option value="Microsoft">Microsoft</option>
              </select>
            </div>

            <div>
              <button
                onClick={() => handleStartSolve(QUESTIONS[0]!)}
                disabled={loadingLadder}
                className="btn-red"
                style={{ height: "40px", padding: "0 24px", borderRadius: "6px" }}
              >
                {loadingLadder ? "Loading…" : "Start Practice →"}
              </button>
            </div>
          </div>
        </div>

        {/* Recommended Questions Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "22px", color: "#F1EDE3", fontWeight: 700 }}>
              Recommended Questions
            </h2>
            <Link to="/practice" style={{ color: "#FF2A1F", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              View All →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredQuestions.map((q) => (
              <div
                key={q.num}
                style={{
                  background: "#12100E",
                  border: "1px solid #221E1A",
                  borderRadius: "8px",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 150ms ease, border-color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#181512";
                  e.currentTarget.style.borderColor = "#332E27";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#12100E";
                  e.currentTarget.style.borderColor = "#221E1A";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <span className="font-display" style={{ color: "#635E55", fontSize: "16px", fontWeight: 600, width: "24px" }}>
                    {q.num}
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#F1EDE3", minWidth: "260px" }}>
                    {q.title}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span className="badge-topic">{q.topic}</span>
                  <span
                    className={
                      q.difficulty === "Easy"
                        ? "badge-easy"
                        : q.difficulty === "Medium"
                        ? "badge-medium"
                        : "badge-hard"
                    }
                  >
                    {q.difficulty}
                  </span>
                  <span className="badge-company">{q.company}</span>
                  <button
                    onClick={() => handleStartSolve(q)}
                    className="btn-outline-red"
                    style={{ marginLeft: "12px" }}
                  >
                    Solve →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
