import { useState, useEffect, useRef } from "react";

const O = "#F97316";
const OR = (a: number) => `rgba(249,115,22,${a})`;

const AGENT_IDS = ["Atlas","Nova","Sniper","Meme","Scribe","Indy","Rook","Iggy","Anchor","Haven"];

interface Message { role: "user" | "assistant"; content: string; }
interface PromptVersion { id: number; agentId: string; content: string; active: boolean; createdAt: string; }
interface AgentStatus { agentId: string; lastActive: string | null; conversationCount: number; hasCustomPrompt: boolean; state: string; }

export default function BackOffice({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"chat" | "prompts" | "status">("chat");
  const [selectedAgent, setSelectedAgent] = useState("Atlas");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);

  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [promptDraft, setPromptDraft] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);

  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (tab === "chat") loadConversation(selectedAgent);
  }, [selectedAgent]);

  useEffect(() => {
    if (tab === "prompts") loadPrompts(selectedAgent);
  }, [selectedAgent, tab]);

  useEffect(() => {
    if (tab === "status") loadStatuses();
  }, [tab]);

  async function loadConversation(agentId: string) {
    try {
      const res = await fetch(`/api/admin/conversations/${agentId}`, { credentials: "include" });
      const data = await res.json();
      setConvId(data.id);
      setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
    } catch {
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setStreaming(true);

    let assistantMsg = "";
    setMessages(prev => [...prev, { role: "assistant", content: "▌" }]);

    try {
      const res = await fetch(`/api/admin/conversations/${selectedAgent}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.content) {
              assistantMsg += json.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg + "▌" };
                return updated;
              });
            }
            if (json.done) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "⚠ Connection error" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function loadPrompts(agentId: string) {
    try {
      const res = await fetch(`/api/admin/prompts/${agentId}`, { credentials: "include" });
      const data = await res.json();
      setPromptVersions(data);
      const active = data.find((v: PromptVersion) => v.active);
      setPromptDraft(active?.content || "");
    } catch {}
  }

  async function savePrompt(activate: boolean) {
    if (!promptDraft.trim()) return;
    setPromptSaving(true);
    try {
      await fetch(`/api/admin/prompts/${selectedAgent}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: promptDraft, activate }),
      });
      await loadPrompts(selectedAgent);
    } finally {
      setPromptSaving(false);
    }
  }

  async function activatePrompt(versionId: number) {
    await fetch(`/api/admin/prompts/${selectedAgent}/activate/${versionId}`, {
      method: "PUT",
      credentials: "include",
    });
    await loadPrompts(selectedAgent);
  }

  async function loadStatuses() {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/admin/agents", { credentials: "include" });
      setAgentStatuses(await res.json());
    } finally {
      setStatusLoading(false);
    }
  }

  async function broadcast() {
    if (!broadcastText.trim()) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ instruction: broadcastText }),
      });
      const data = await res.json();
      setBroadcastResult(`✓ Broadcast delivered to ${data.agentsReached}/${data.total} agents`);
      setBroadcastText("");
    } catch {
      setBroadcastResult("⚠ Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#07070b", display: "flex", flexDirection: "column", fontFamily: "'Inter',sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ height: 52, background: "rgba(0,0,0,0.6)", borderBottom: `1px solid ${OR(0.15)}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: OR(0.5), cursor: "pointer", fontSize: 18, lineHeight: 1 }}>←</button>
        <div style={{ width: 1, height: 24, background: OR(0.15) }} />
        <span style={{ color: O, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>NEXT HQ</span>
        <span style={{ color: OR(0.3), fontSize: 11, letterSpacing: 1 }}>Mission Control</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["chat", "prompts", "status"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? OR(0.12) : "transparent",
              border: `1px solid ${tab === t ? OR(0.4) : OR(0.1)}`,
              color: tab === t ? O : OR(0.4),
              padding: "4px 14px", borderRadius: 4, cursor: "pointer",
              fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase",
              transition: "all 0.2s",
            }}>{t === "chat" ? "Admin Chat" : t === "prompts" ? "Prompts" : "Status"}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Agent Sidebar */}
        <div style={{ width: 160, background: "rgba(0,0,0,0.4)", borderRight: `1px solid ${OR(0.1)}`, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "12px 12px 6px", color: OR(0.3), fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Agents</div>
          {AGENT_IDS.map(id => (
            <button key={id} onClick={() => setSelectedAgent(id)} style={{
              width: "100%", textAlign: "left", background: selectedAgent === id ? OR(0.1) : "transparent",
              border: "none", borderLeft: selectedAgent === id ? `2px solid ${O}` : "2px solid transparent",
              color: selectedAgent === id ? "#fff" : OR(0.5),
              padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: selectedAgent === id ? 600 : 400,
              transition: "all 0.15s",
            }}>{id}</button>
          ))}
        </div>

        {/* Main Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── ADMIN CHAT ── */}
          {tab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && (
                  <div style={{ margin: "auto", textAlign: "center", color: OR(0.2), fontSize: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
                    Admin channel open to <strong style={{ color: OR(0.5) }}>{selectedAgent}</strong>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "72%", padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: m.role === "user" ? `linear-gradient(135deg, ${O}, #ea580c)` : "rgba(255,255,255,0.05)",
                      border: m.role === "assistant" ? `1px solid ${OR(0.12)}` : "none",
                      color: "#fff", fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                    }}>{m.content}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div style={{ borderTop: `1px solid ${OR(0.1)}`, padding: "12px 16px", display: "flex", gap: 10, flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder={`Direct message to ${selectedAgent}...`}
                  disabled={streaming}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${OR(0.15)}`,
                    borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 13, outline: "none",
                    fontFamily: "'Inter',sans-serif",
                  }}
                />
                <button onClick={sendMessage} disabled={streaming || !input.trim()} style={{
                  background: streaming ? OR(0.15) : `linear-gradient(135deg,${O},#ea580c)`,
                  border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px",
                  cursor: streaming ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                }}>{streaming ? "..." : "Send"}</button>
              </div>

              {/* Broadcast */}
              <div style={{ borderTop: `1px solid ${OR(0.08)}`, padding: "10px 16px", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
                <div style={{ color: OR(0.35), fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Broadcast to All Agents</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={broadcastText}
                    onChange={e => setBroadcastText(e.target.value)}
                    placeholder="Send an instruction to every agent simultaneously..."
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`,
                      borderRadius: 6, color: "#fff", padding: "7px 12px", fontSize: 12, outline: "none",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  />
                  <button onClick={broadcast} disabled={broadcasting || !broadcastText.trim()} style={{
                    background: "transparent", border: `1px solid ${OR(0.3)}`, borderRadius: 6,
                    color: OR(0.7), padding: "7px 14px", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                  }}>📡 Broadcast</button>
                </div>
                {broadcastResult && <div style={{ marginTop: 6, color: broadcastResult.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 11 }}>{broadcastResult}</div>}
              </div>
            </>
          )}

          {/* ── PROMPTS ── */}
          {tab === "prompts" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", gap: 20 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>System Prompt — {selectedAgent}</div>
                <textarea
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  placeholder="Write a custom system prompt for this agent. Changes take effect immediately when activated."
                  style={{
                    flex: 1, minHeight: 280, background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.15)}`,
                    borderRadius: 8, color: "#fff", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6,
                    resize: "vertical", outline: "none", fontFamily: "monospace",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => savePrompt(false)} disabled={promptSaving} style={{
                    background: "transparent", border: `1px solid ${OR(0.3)}`, borderRadius: 6,
                    color: OR(0.7), padding: "8px 16px", cursor: "pointer", fontSize: 12,
                  }}>Save Draft</button>
                  <button onClick={() => savePrompt(true)} disabled={promptSaving} style={{
                    background: `linear-gradient(135deg,${O},#ea580c)`, border: "none", borderRadius: 6,
                    color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>⚡ Save &amp; Activate Now</button>
                </div>
              </div>
              <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Version History</div>
                {promptVersions.length === 0 && <div style={{ color: OR(0.2), fontSize: 12 }}>No versions yet</div>}
                {promptVersions.map(v => (
                  <div key={v.id} style={{
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${v.active ? OR(0.4) : OR(0.1)}`,
                    borderRadius: 6, padding: "8px 10px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: v.active ? O : OR(0.35) }}>{v.active ? "● ACTIVE" : "○ draft"}</span>
                      <span style={{ fontSize: 9, color: OR(0.25) }}>{new Date(v.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.4, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{v.content}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setPromptDraft(v.content)} style={{ background: "transparent", border: `1px solid ${OR(0.15)}`, borderRadius: 4, color: OR(0.5), padding: "3px 8px", cursor: "pointer", fontSize: 10 }}>Load</button>
                      {!v.active && <button onClick={() => activatePrompt(v.id)} style={{ background: "transparent", border: `1px solid ${OR(0.3)}`, borderRadius: 4, color: OR(0.7), padding: "3px 8px", cursor: "pointer", fontSize: 10 }}>Activate</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STATUS ── */}
          {tab === "status" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Agent Status Board</div>
                <button onClick={loadStatuses} disabled={statusLoading} style={{ background: "transparent", border: `1px solid ${OR(0.2)}`, borderRadius: 4, color: OR(0.5), padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
                  {statusLoading ? "Loading..." : "↻ Refresh"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {agentStatuses.length === 0 && !statusLoading && (
                  <div style={{ gridColumn: "1/-1", color: OR(0.2), fontSize: 12, textAlign: "center", padding: 40 }}>Click Refresh to load agent statuses</div>
                )}
                {agentStatuses.map(s => (
                  <div key={s.agentId} style={{
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`,
                    borderRadius: 8, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{s.agentId}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: OR(0.08), color: OR(0.6), letterSpacing: 1 }}>{s.state}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Conversations</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{s.conversationCount}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Custom Prompt</span>
                        <span style={{ color: s.hasCustomPrompt ? "#22c55e" : OR(0.3) }}>{s.hasCustomPrompt ? "Active" : "Default"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Last Active</span>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>{s.lastActive ? new Date(s.lastActive).toLocaleTimeString() : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
