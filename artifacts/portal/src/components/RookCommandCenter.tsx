import { useState, useEffect, useRef } from "react";
import rookImg from "@assets/agents/rook/idle.png";

const R   = "#dc2626";
const RL  = "#ef4444";
const RR  = (a: number) => `rgba(220,38,38,${a})`;

interface Msg { from: "user" | "rook"; text: string; streaming?: boolean; }

export default function RookCommandCenter({ onBack }: { onBack: () => void }) {
  const [messages, setMessages]       = useState<Msg[]>([]);
  const [input, setInput]             = useState("");
  const [convId, setConvId]           = useState<number | null>(null);
  const [busy, setBusy]               = useState(false);
  const [emailMode, setEmailMode]     = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody]     = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/openai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rook Security Command", agentId: "rook" }),
    })
      .then(r => r.json())
      .then(data => {
        setConvId(data.id);
        setMessages([{
          from: "rook",
          text: "I'm Rook. You've accessed the secure channel. This line is direct — no logs visible to anyone else. What do you need assessed, reviewed, or flagged?",
        }]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !convId || busy) return;
    setInput("");
    setMessages(prev => [...prev, { from: "user", text }]);
    setBusy(true);
    setMessages(prev => [...prev, { from: "rook", text: "", streaming: true }]);

    const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.done)    { setBusy(false); }
          if (d.content) {
            full += d.content;
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { from: "rook", text: full, streaming: true };
              return next;
            });
          }
        } catch { /* skip */ }
      }
    }
    setMessages(prev => {
      const next = [...prev];
      next[next.length - 1] = { from: "rook", text: full, streaming: false };
      return next;
    });
    setBusy(false);
  };

  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim() || emailStatus === "sending") return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/security/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, message: emailBody }),
      });
      if (res.ok) {
        setEmailStatus("sent");
        setTimeout(() => {
          setEmailStatus("idle");
          setEmailMode(false);
          setEmailSubject("");
          setEmailBody("");
        }, 3000);
      } else {
        setEmailStatus("error");
        setTimeout(() => setEmailStatus("idle"), 5000);
      }
    } catch {
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 5000);
    }
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "linear-gradient(180deg,#080101 0%,#050000 60%,#020000 100%)",
      fontFamily: "'Inter',monospace",
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Subtle scanline effect */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 4px)",
      }} />

      {/* Corner red glow */}
      <div style={{
        position: "absolute", top: -80, left: -80, width: 400, height: 300,
        background: `radial-gradient(ellipse,${RR(0.18)} 0%,transparent 70%)`,
        filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── HEADER ── */}
      <div style={{
        padding: "13px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${RR(0.3)}`,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(14px)",
        zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onBack}
            style={{
              background: "transparent", border: `1px solid ${RR(0.28)}`,
              color: "rgba(255,255,255,0.38)", fontSize: 11, cursor: "pointer",
              padding: "4px 11px", borderRadius: 4, fontFamily: "inherit",
              letterSpacing: 1, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = RR(0.65); e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = RR(0.28); e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}
          >← EXIT</button>
          <div style={{ width: 1, height: 18, background: RR(0.25) }} />
          <span style={{ color: R, fontSize: 10, letterSpacing: 4, fontWeight: 700 }}>ROOK // SECURITY COMMAND CENTER</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: R, boxShadow: `0 0 8px ${R}`,
            animation: "rookBlink 1.4s ease-in-out infinite",
          }} />
          <span style={{ color: R, fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>SECURE CHANNEL ACTIVE</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", zIndex: 2 }}>

        {/* Left sidebar — Rook profile */}
        <div style={{
          width: 248, flexShrink: 0,
          borderRight: `1px solid ${RR(0.2)}`,
          padding: "22px 18px",
          display: "flex", flexDirection: "column", gap: 16,
          overflowY: "auto",
          background: "rgba(0,0,0,0.3)",
        }}>
          {/* Photo */}
          <div style={{
            background: RR(0.07), border: `1px solid ${RR(0.22)}`,
            borderRadius: 6, overflow: "hidden",
          }}>
            <img
              src={rookImg} alt="Rook"
              style={{
                width: "100%", display: "block",
                filter: "saturate(0.6) contrast(1.1) brightness(0.88)",
              }}
            />
          </div>

          {/* Identity */}
          <div>
            <div style={{ color: R, fontSize: 8, letterSpacing: 3, marginBottom: 4, fontWeight: 700 }}>AGENT DESIGNATION</div>
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>ROOK</div>
            <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>Security & Protection Intelligence</div>
          </div>

          <div style={{ height: 1, background: RR(0.18) }} />

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              ["CLEARANCE",   "OWNER-LEVEL"],
              ["SPECIALTY",   "Security & Protection"],
              ["CHANNEL",     "Encrypted Direct"],
              ["STATUS",      "Active — Monitoring"],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, letterSpacing: 2.5, marginBottom: 2 }}>{label}</div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: label === "STATUS" ? "#22c55e" : "rgba(255,255,255,0.78)",
                }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: RR(0.18) }} />

          {/* Security Shark Emailer trigger */}
          <button
            onClick={() => setEmailMode(v => !v)}
            style={{
              padding: "10px 13px",
              background: emailMode ? RR(0.18) : "transparent",
              border: `1px solid ${emailMode ? RR(0.7) : RR(0.32)}`,
              borderRadius: 5, fontFamily: "inherit",
              color: emailMode ? RL : "rgba(255,255,255,0.55)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s", textAlign: "left",
            }}
            onMouseEnter={e => { if (!emailMode) { e.currentTarget.style.borderColor = RR(0.6); e.currentTarget.style.color = "rgba(255,255,255,0.88)"; } }}
            onMouseLeave={e => { if (!emailMode) { e.currentTarget.style.borderColor = RR(0.32); e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
          >
            <span style={{ fontSize: 15 }}>📧</span>
            <span>Security Shark Emailer</span>
          </button>
        </div>

        {/* Right — chat + email compose */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Security Shark Emailer compose panel */}
          {emailMode && (
            <div style={{
              padding: "16px 22px",
              borderBottom: `1px solid ${RR(0.28)}`,
              background: RR(0.04),
              flexShrink: 0,
            }}>
              <div style={{ color: R, fontSize: 8, letterSpacing: 3.5, marginBottom: 12, fontWeight: 700 }}>
                📧 SECURITY SHARK EMAILER — DIRECT LINE TO OWNER
              </div>
              <input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Security update subject line..."
                style={{
                  width: "100%", padding: "8px 12px", boxSizing: "border-box",
                  background: "rgba(0,0,0,0.55)", border: `1px solid ${RR(0.28)}`,
                  borderRadius: 4, color: "#fff", fontSize: 12,
                  fontFamily: "inherit", outline: "none", marginBottom: 8,
                }}
              />
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Security update details — what to flag, monitor, review, or escalate..."
                rows={3}
                style={{
                  width: "100%", padding: "8px 12px", boxSizing: "border-box",
                  background: "rgba(0,0,0,0.55)", border: `1px solid ${RR(0.28)}`,
                  borderRadius: 4, color: "#fff", fontSize: 12,
                  fontFamily: "inherit", outline: "none", resize: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <button
                  onClick={sendEmail}
                  disabled={emailStatus === "sending" || !emailSubject.trim() || !emailBody.trim()}
                  style={{
                    padding: "8px 20px", border: "none", borderRadius: 4,
                    background: emailStatus === "sent"  ? "#15803d"
                               : emailStatus === "error" ? "#7f1d1d"
                               : `linear-gradient(135deg,${R},${RL})`,
                    color: "#fff", fontSize: 12, fontWeight: 700,
                    cursor: emailStatus === "sending" || !emailSubject.trim() || !emailBody.trim() ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.2s",
                    opacity: emailStatus === "sending" || !emailSubject.trim() || !emailBody.trim() ? 0.5 : 1,
                  }}
                >
                  {emailStatus === "sending" ? "Transmitting…"
                   : emailStatus === "sent"  ? "✓ Transmitted to Owner"
                   : emailStatus === "error" ? "✗ Transmission Failed"
                   : "🔒 Transmit to Owner"}
                </button>
                {emailStatus === "error" && (
                  <span style={{ color: "#fca5a5", fontSize: 11 }}>
                    Set RESEND_API_KEY + OWNER_EMAIL in environment
                  </span>
                )}
                {emailStatus === "sent" && (
                  <span style={{ color: "#86efac", fontSize: 11 }}>Security report delivered securely</span>
                )}
              </div>
            </div>
          )}

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 13 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px",
                  borderRadius: m.from === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: m.from === "user" ? RR(0.14) : "rgba(255,255,255,0.035)",
                  border: `1px solid ${m.from === "user" ? RR(0.32) : "rgba(255,255,255,0.07)"}`,
                  color: "rgba(255,255,255,0.87)", fontSize: 13, lineHeight: 1.65,
                }}>
                  {m.from === "rook" && (
                    <div style={{ color: R, fontSize: 8, letterSpacing: 2.5, marginBottom: 5, fontWeight: 700 }}>ROOK</div>
                  )}
                  {m.text}
                  {m.streaming && m.text.length === 0 && (
                    <span style={{ opacity: 0.4 }}>Analyzing…</span>
                  )}
                  {m.streaming && (
                    <span style={{ opacity: 0.5, animation: "rookBlink 0.65s infinite" }}>▍</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: "13px 22px",
            borderTop: `1px solid ${RR(0.2)}`,
            background: "rgba(0,0,0,0.55)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !busy && send()}
                placeholder={convId ? "Transmit to Rook…" : "Establishing secure connection…"}
                disabled={!convId || busy}
                style={{
                  flex: 1, padding: "11px 14px",
                  background: "rgba(255,255,255,0.035)",
                  border: `1px solid ${RR(busy ? 0.4 : 0.18)}`,
                  borderRadius: 5, color: "#fff", fontSize: 13,
                  fontFamily: "inherit", outline: "none",
                  opacity: !convId || busy ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || !convId || busy}
                style={{
                  padding: "11px 20px", borderRadius: 5, border: "none",
                  background: input.trim() && convId && !busy
                    ? `linear-gradient(135deg,${R},${RL})`
                    : "rgba(255,255,255,0.06)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: input.trim() && convId && !busy ? "pointer" : "default",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {busy ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rookBlink { 0%,100%{opacity:1} 50%{opacity:0.15} }
      `}</style>
    </div>
  );
}
