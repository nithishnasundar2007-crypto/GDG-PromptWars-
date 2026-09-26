import { useState } from "react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
  bullets?: string[];
  subsections?: { title: string; items: string[] }[];
}

export function AiCoachScreen() {
  const [selectedChat, setSelectedChat] = useState("System Design concept");
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "user",
      text: "Explain system design for a chat application",
    },
    {
      id: "m2",
      sender: "coach",
      text: "Here's a high-level system design for a chat application:",
      subsections: [
        {
          title: "01. Requirements",
          items: [
            "Real time messaging",
            "1:1 and group chats",
            "Message delivery and read receipts",
            "High availability and scalability",
          ],
        },
        {
          title: "02. High Level Architecture",
          items: [
            "Client (Web/Mobile) → Load Balancer → Application Server",
            "Real time communication using WebSocket",
            "Message storage (Database) and caching (Redis)",
          ],
        },
      ],
    },
  ]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: inputVal,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");

    setTimeout(() => {
      const coachMsg: Message = {
        id: `c_${Date.now()}`,
        sender: "coach",
        text: `Here is the structured breakdown for "${inputVal}":`,
        subsections: [
          {
            title: "01. Core Concept & Placement Relevance",
            items: [
              "Key concept tested by top tier tech interviewers",
              "Trade-offs between latency, throughput, and state consistency",
              "Typical follow-up probing questions to expect",
            ],
          },
          {
            title: "02. Recommended Approach",
            items: [
              "Always clarify constraints and traffic estimates upfront",
              "Diagram data flow step-by-step from client to database",
              "Highlight caching and indexing bottlenecks explicitly",
            ],
          },
        ],
      };
      setMessages((prev) => [...prev, coachMsg]);
    }, 600);
  };

  return (
    <div style={{ backgroundColor: "#080706", minHeight: "calc(100vh - 64px)", color: "#F1EDE3", display: "flex", flexDirection: "column" }}>
      {/* Subheader */}
      <div className="sub-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
      </div>

      <div style={{ maxWidth: "1320px", width: "100%", margin: "0 auto", padding: "0 32px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Heading */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(36px, 4.5vw, 56px)",
              lineHeight: 1.0,
              fontWeight: 700,
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            AI COACH.
          </h1>
          <p style={{ color: "#9E998F", fontSize: "14px" }}>
            Your 24/7 placement preparation companion. Ask questions, get guidance and clear your doubts.
          </p>
        </div>

        {/* Chat UI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", flex: 1, minHeight: "560px" }}>
          
          {/* Left Sidebar */}
          <div
            className="card-panel"
            style={{
              background: "#12100E",
              borderColor: "#221E1A",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => {
                setMessages([]);
                setSelectedChat("New Chat");
              }}
              className="btn-red"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", marginBottom: "24px" }}
            >
              + New Chat
            </button>

            {/* Today Section */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#635E55", letterSpacing: "1px", marginBottom: "12px", fontWeight: 600 }}>
                Today
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {["DSA doubt", "System Design concept", "HR question", "Resume review"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setSelectedChat(item)}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      background: selectedChat === item ? "#1C1916" : "transparent",
                      color: selectedChat === item ? "#F1EDE3" : "#8E8A82",
                      border: selectedChat === item ? "1px solid #2B2620" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    • {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Yesterday Section */}
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#635E55", letterSpacing: "1px", marginBottom: "12px", fontWeight: 600 }}>
                Yesterday
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {["TCS NQT preparation", "Time management"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setSelectedChat(item)}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      background: selectedChat === item ? "#1C1916" : "transparent",
                      color: selectedChat === item ? "#F1EDE3" : "#8E8A82",
                      border: selectedChat === item ? "1px solid #2B2620" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    • {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Chat Conversation Area */}
          <div
            className="card-panel"
            style={{
              background: "#12100E",
              borderColor: "#221E1A",
              borderRadius: "10px",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Messages Scroll Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", maxHeight: "500px", paddingRight: "8px" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                    gap: "12px",
                  }}
                >
                  {msg.sender === "coach" && (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#FF2A1F",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      C
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: "75%",
                      background: msg.sender === "user" ? "#1E1A16" : "#161411",
                      border: "1px solid",
                      borderColor: msg.sender === "user" ? "#2B2620" : "#24201C",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      color: "#F1EDE3",
                      fontSize: "14px",
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ marginBottom: msg.subsections ? "12px" : "0" }}>{msg.text}</p>

                    {msg.subsections?.map((sub, i) => (
                      <div key={i} style={{ marginTop: "12px" }}>
                        <div style={{ fontWeight: 600, color: "#FF4A3D", fontSize: "13px", marginBottom: "4px" }}>
                          {sub.title}
                        </div>
                        <ul style={{ paddingLeft: "18px", color: "#C8C4BC", fontSize: "13px" }}>
                          {sub.items.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: "3px" }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {msg.sender === "user" && (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#28231E",
                        border: "1px solid #3B342C",
                        color: "#F1EDE3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      S
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Input Composer */}
            <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                type="text"
                className="input-dark"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask your question..."
                style={{ flex: 1, padding: "12px 18px", fontSize: "14px" }}
              />
              <button
                onClick={handleSend}
                className="btn-red"
                style={{ width: "44px", height: "44px", padding: 0, borderRadius: "8px", flexShrink: 0 }}
                title="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
