import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import type { Question, LadderState, AnyStep } from "../../../contracts/types";

const DEFAULT_STARTER_CODE = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your code here
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []
`;

export function ProbeScreen() {
  const { ladderId } = useParams<{ ladderId: string }>();
  const location = useLocation();

  const state = location.state as { questionTitle?: string; questionCompany?: string; questionDifficulty?: string } | undefined;
  const questionTitle = state?.questionTitle || "Two Sum";
  const questionCompany = state?.questionCompany || "Amazon";
  const questionDifficulty = state?.questionDifficulty || "Easy";

  const [language, setLanguage] = useState("Python 3");
  const [code, setCode] = useState(DEFAULT_STARTER_CODE);
  const [isResultMode, setIsResultMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"solution" | "editorial" | "discussion">("solution");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runnerReady, setRunnerReady] = useState(true);
  const [ladder, setLadder] = useState<LadderState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentStep, setCurrentStep] = useState<AnyStep>("apply");

  useEffect(() => {
    async function init() {
      const runnerRes = await api.initRunner();
      if (runnerRes.ok) {
        setRunnerReady(runnerRes.data.ready);
      }
      // If we don't have a ladder yet, start one
      const res = await api.startLadder("st_demo", "tp_graphs", "probe", "apply");
      if (res.ok) {
        setLadder(res.data.ladder);
        setQuestion(res.data.question);
        if (res.data.question.starterCode) {
          setCode(DEFAULT_STARTER_CODE);
        }
      }
    }
    void init();
  }, [ladderId]);

  const handleRun = async () => {
    setIsRunning(true);
    const qId = question?.id || "q_bfs_probe";
    const res = await api.runSample(qId, code, "apply");
    setIsRunning(false);
    if (res.ok) {
      alert("Sample tests passed! (" + res.data.runtimeMs + " ms)");
    } else {
      alert("Run error: " + res.error.message);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const activeLadderId = ladder?.id || ladderId || "ld_1";
    const answer = code;
    const res = await api.submitStep(activeLadderId, answer, 120_000);
    setIsSubmitting(false);
    if (res.ok) {
      setIsResultMode(true);
    } else {
      alert("Submission error: " + res.error.message);
    }
  };

  const handleReset = () => {
    setCode(DEFAULT_STARTER_CODE);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    alert("Code copied to clipboard!");
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", display: "flex", flexDirection: "column" }}>
      {/* Subheader */}
      <div className="sub-nav" style={{ padding: "14px 32px", borderBottom: "1px solid #1A1714" }}>
        <Link to="/practice" className="back-link">
          ← Back to Practice
        </Link>
      </div>

      <div style={{ maxWidth: "1440px", width: "100%", margin: "0 auto", padding: "20px 32px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Question Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "8px" }}>
              {questionTitle}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="badge-topic">Arrays</span>
              <span className="badge-easy">{questionDifficulty}</span>
              <span className="badge-company">{questionCompany}</span>
              <span style={{ color: "#77736B", fontSize: "12px", marginLeft: "8px" }}>
                Step: <strong style={{ color: "#FF2A1F", textTransform: "uppercase" }}>{currentStep}</strong>
              </span>
            </div>
          </div>

          {!isResultMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <select
                className="select-dark"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ padding: "6px 28px 6px 12px", fontSize: "13px" }}
              >
                <option value="Python 3">Python 3</option>
                <option value="SQL">SQL (PostgreSQL)</option>
              </select>

              <button
                onClick={handleReset}
                className="btn-dark"
                style={{ padding: "6px 14px", fontSize: "13px", height: "34px" }}
                title="Reset starter code"
              >
                ↺ Reset
              </button>
            </div>
          ) : (
            /* Tabs on Result Screen (05) */
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setActiveTab("solution")}
                style={{
                  background: activeTab === "solution" ? "#1A1714" : "transparent",
                  border: "1px solid",
                  borderColor: activeTab === "solution" ? "#FF2A1F" : "#24201C",
                  color: activeTab === "solution" ? "#F1EDE3" : "#8E8A82",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Your Solution
              </button>
              <button
                onClick={() => setActiveTab("editorial")}
                style={{
                  background: activeTab === "editorial" ? "#1A1714" : "transparent",
                  border: "1px solid",
                  borderColor: activeTab === "editorial" ? "#FF2A1F" : "#24201C",
                  color: activeTab === "editorial" ? "#F1EDE3" : "#8E8A82",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Editorial
              </button>
              <button
                onClick={() => setActiveTab("discussion")}
                style={{
                  background: activeTab === "discussion" ? "#1A1714" : "transparent",
                  border: "1px solid",
                  borderColor: activeTab === "discussion" ? "#FF2A1F" : "#24201C",
                  color: activeTab === "discussion" ? "#F1EDE3" : "#8E8A82",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Discussion
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SCREEN 04: QUESTION SOLVE MODE                                */}
        {/* ------------------------------------------------------------- */}
        {!isResultMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "24px", flex: 1 }}>
            
            {/* Left Column: Problem Statement & Examples */}
            <div
              className="card-panel"
              style={{
                background: "#12100E",
                borderColor: "#221E1A",
                borderRadius: "10px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                maxHeight: "720px",
              }}
            >
              <h2 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "14px" }}>
                Problem Statement
              </h2>

              <p style={{ color: "#C4BFB6", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
                Given an array of integers <code className="mono" style={{ background: "#1F1B17", color: "#FF4A3D", padding: "2px 6px" }}>nums</code> and an integer <code className="mono" style={{ background: "#1F1B17", color: "#FF4A3D", padding: "2px 6px" }}>target</code>, return indices of the two numbers such that they add up to <code className="mono" style={{ background: "#1F1B17", color: "#FF4A3D", padding: "2px 6px" }}>target</code>.
                <br /><br />
                You may assume that each input would have exactly one solution, and you may not use the same element twice.
              </p>

              <h2 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "14px" }}>
                Examples
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                <div style={{ background: "#181512", border: "1px solid #26221E", borderRadius: "8px", padding: "14px 16px" }}>
                  <div className="mono" style={{ fontSize: "13px", color: "#E8E1D5", lineHeight: 1.7 }}>
                    <strong>Input:</strong> nums = [2, 7, 11, 15], target = 9<br />
                    <strong>Output:</strong> [0, 1]<br />
                    <span style={{ color: "#9E998F" }}>Explanation: nums[0] + nums[1] == 9</span>
                  </div>
                </div>

                <div style={{ background: "#181512", border: "1px solid #26221E", borderRadius: "8px", padding: "14px 16px" }}>
                  <div className="mono" style={{ fontSize: "13px", color: "#E8E1D5", lineHeight: 1.7 }}>
                    <strong>Input:</strong> nums = [3, 2, 4], target = 6<br />
                    <strong>Output:</strong> [1, 2]
                  </div>
                </div>
              </div>

              {/* Probe Ladder Step Progress */}
              <div style={{ marginTop: "auto", borderTop: "1px solid #221E1A", paddingTop: "16px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#77736B", marginBottom: "10px" }}>
                  Probe Ladder Progression
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(["recognize", "hint", "apply", "explain", "transfer"] as AnyStep[]).map((stepName) => (
                    <button
                      key={stepName}
                      onClick={() => setCurrentStep(stepName)}
                      style={{
                        background: currentStep === stepName ? "rgba(255, 42, 31, 0.15)" : "#181512",
                        border: "1px solid",
                        borderColor: currentStep === stepName ? "#FF2A1F" : "#24201C",
                        color: currentStep === stepName ? "#FF2A1F" : "#77736B",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {stepName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Code Editor & Actions */}
            <div
              className="card-panel"
              style={{
                background: "#0E0C0A",
                borderColor: "#221E1A",
                borderRadius: "10px",
                padding: "0",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Editor Header / Tab */}
              <div style={{ background: "#14120F", borderBottom: "1px solid #221E1A", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: "12px", color: "#8E8A82" }}>
                  solution.py
                </span>
                <span style={{ fontSize: "12px", color: runnerReady ? "#10B981" : "#F59E0B" }}>
                  {runnerReady ? "● Runner ready" : "○ Preloading runner…"}
                </span>
              </div>

              {/* Code Area with line numbers */}
              <div style={{ display: "flex", flex: 1, minHeight: "440px", background: "#0B0908" }}>
                {/* Line numbers */}
                <div
                  className="mono"
                  style={{
                    padding: "16px 12px",
                    background: "#0E0C0A",
                    borderRight: "1px solid #1C1916",
                    color: "#524D44",
                    fontSize: "13px",
                    lineHeight: "22px",
                    userSelect: "none",
                    textAlign: "right",
                  }}
                >
                  {Array.from({ length: 18 }, (_, i) => (
                    <div key={i}>{String(i + 1).padStart(2, "0")}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  className="mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#F1EDE3",
                    fontSize: "13px",
                    lineHeight: "22px",
                    padding: "16px",
                    resize: "none",
                    whiteSpace: "pre",
                    overflowWrap: "normal",
                    overflowX: "auto",
                  }}
                  spellCheck={false}
                />
              </div>

              {/* Bottom Action Bar */}
              <div style={{ background: "#14120F", borderTop: "1px solid #221E1A", padding: "14px 20px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
                <button
                  onClick={handleRun}
                  disabled={isRunning || !runnerReady}
                  className="btn-dark"
                  style={{ padding: "8px 20px", fontSize: "13px" }}
                >
                  {isRunning ? "Running tests…" : "Run Code"}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !runnerReady}
                  className="btn-red"
                  style={{ padding: "8px 24px", fontSize: "13px" }}
                >
                  {isSubmitting ? "Running tests… checking your points…" : "Submit →"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* SCREEN 05: QUESTION RESULT MODE                               */
          /* ------------------------------------------------------------- */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "24px", flex: 1 }}>
            
            {/* Left Column: Accepted Status & Test Cases */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Accepted Card */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10B981",
                    fontSize: "26px",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>

                <div>
                  <div className="font-display" style={{ fontSize: "28px", fontWeight: 700, color: "#10B981", letterSpacing: "0.5px" }}>
                    Accepted
                  </div>
                  <div style={{ color: "#8E8A82", fontSize: "13px", marginTop: "4px" }}>
                    Runtime: <strong style={{ color: "#F1EDE3" }}>36 ms</strong> &nbsp;•&nbsp; Memory: <strong style={{ color: "#F1EDE3" }}>16.2 MB</strong>
                  </div>
                </div>
              </div>

              {/* Test Cases List */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "24px",
                }}
              >
                <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "16px" }}>
                  Test Cases
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { name: "Case 1", status: "Passed", time: "0 ms" },
                    { name: "Case 2", status: "Passed", time: "1 ms" },
                    { name: "Case 3", status: "Passed", time: "0 ms" },
                    { name: "Case 4", status: "Passed", time: "0 ms" },
                  ].map((tc) => (
                    <div
                      key={tc.name}
                      style={{
                        background: "#181512",
                        border: "1px solid #221E1A",
                        borderRadius: "8px",
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span>
                        <span style={{ color: "#F1EDE3", fontSize: "14px", fontWeight: 500 }}>{tc.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <span style={{ color: "#10B981", fontSize: "13px", fontWeight: 600 }}>{tc.status}</span>
                        <span style={{ color: "#77736B", fontSize: "13px" }}>{tc.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setIsResultMode(false)}
                    className="btn-dark"
                    style={{ flex: 1, fontSize: "13px" }}
                  >
                    Edit Solution
                  </button>
                  <Link
                    to="/map"
                    className="btn-red"
                    style={{ flex: 1, fontSize: "13px" }}
                  >
                    View in Map →
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Code & Explanation */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Code Preview Card */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "20px 24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3" }}>
                    Code
                  </h3>
                  <button
                    onClick={handleCopyCode}
                    className="btn-dark"
                    style={{ padding: "4px 12px", fontSize: "12px", height: "28px" }}
                  >
                    ⧉ Copy
                  </button>
                </div>

                <div
                  className="mono"
                  style={{
                    background: "#0B0908",
                    border: "1px solid #1C1916",
                    borderRadius: "6px",
                    padding: "16px",
                    fontSize: "13px",
                    lineHeight: "22px",
                    color: "#E8E1D5",
                    overflowX: "auto",
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    <span style={{ color: "#F87171" }}>class</span> <span style={{ color: "#FBBF24" }}>Solution</span>:{"\n"}
                    {"    "}<span style={{ color: "#60A5FA" }}>def</span> <span style={{ color: "#34D399" }}>twoSum</span>(self, nums: List[int], target: int) -&gt; List[int]:{"\n"}
                    {"        "}# Hash map solution{"\n"}
                    {"        "}seen = &#123;&#125;{"\n"}
                    {"        "}for i, num in enumerate(nums):{"\n"}
                    {"            "}diff = target - num{"\n"}
                    {"            "}if diff in seen:{"\n"}
                    {"                "}return [seen[diff], i]{"\n"}
                    {"            "}seen[num] = i{"\n"}
                    {"        "}return []
                  </pre>
                </div>
              </div>

              {/* Explanation Card */}
              <div
                className="card-panel"
                style={{
                  background: "#12100E",
                  borderColor: "#221E1A",
                  borderRadius: "10px",
                  padding: "20px 24px",
                }}
              >
                <h3 className="font-display" style={{ fontSize: "18px", color: "#F1EDE3", marginBottom: "12px" }}>
                  Explanation
                </h3>
                <p style={{ color: "#C4BFB6", fontSize: "14px", lineHeight: 1.6 }}>
                  We use a hash map to store the numbers and their indices. For each number, we check if (target - number) exists in the map. If yes, we return the indices. This allows an optimal O(n) time complexity with a single pass through the array.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
