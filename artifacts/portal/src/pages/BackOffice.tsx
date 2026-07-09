import { useState, useEffect, useRef } from "react";

const O = "#F97316";
const OR = (a: number) => `rgba(249,115,22,${a})`;

const AGENT_IDS = ["Atlas","Nova","Sniper","Meme","Scribe","Indy","Rook","Iggy","Anchor","Haven"];

interface Message { role: "user" | "assistant"; content: string; }
interface PromptVersion { id: number; agentId: string; content: string; active: boolean; createdAt: string; }
interface AgentStatus { agentId: string; lastActive: string | null; conversationCount: number; hasCustomPrompt: boolean; state: string; }
interface AgentMemoryRow {
  agentId: string; lastSyncedAt: string | null; lastStatus: string;
  lastError: string | null; syncAttempts: number; clickupTasksCreated: number;
  notionDbConfigured: boolean; notionDbId: string | null;
}
interface ClickUpTask { id: string; name: string; url: string; fromAgent: string; toAgent: string; }
interface MemoryStatus {
  notion: { configured: boolean; teamDbId: string | null; agentDbCount: number };
  clickup: { configured: boolean; listInfo: { name: string; taskCount: number } | null; recentTasks: ClickUpTask[] };
  agents: AgentMemoryRow[];
}

export default function BackOffice({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"chat" | "prompts" | "status" | "memory">("chat");
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

  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [syncingAgent, setSyncingAgent] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (tab === "memory") loadMemoryStatus();
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

  async function loadMemoryStatus() {
    setMemoryLoading(true);
    try {
      const res = await fetch("/api/admin/memory/status", { credentials: "include" });
      setMemoryStatus(await res.json());
    } catch {
      setMemoryStatus(null);
    } finally {
      setMemoryLoading(false);
    }
  }

  async function syncAgent(agentId: string) {
    setSyncingAgent(agentId);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/admin/memory/sync/${agentId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`✓ ${agentId} synced to Notion`);
        await loadMemoryStatus();
      } else {
        setSyncResult(`⚠ ${data.error ?? "Sync failed"}`);
      }
    } catch {
      setSyncResult("⚠ Connection error");
    } finally {
      setSyncingAgent(null);
    }
  }

  async function handleImport() {
    const file = importFileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/admin/memory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(`✓ Imported ${data.imported} conversations (${data.failed} failed)`);
        await loadMemoryStatus();
      } else {
        setImportResult(`⚠ ${data.error ?? "Import failed"}`);
      }
    } catch (e: any) {
      setImportResult(`⚠ ${e?.message ?? "Parse error"}`);
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
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
          {(["chat", "prompts", "status", "memory"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? OR(0.12) : "transparent",
              border: `1px solid ${tab === t ? OR(0.4) : OR(0.1)}`,
              color: tab === t ? O : OR(0.4),
              padding: "4px 14px", borderRadius: 4, cursor: "pointer",
              fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase",
              transition: "all 0.2s",
            }}>{t === "chat" ? "Admin Chat" : t === "prompts" ? "Prompts" : t === "status" ? "Status" : "Memory"}</button>
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

          {/* ── MEMORY ── */}
          {tab === "memory" && (
            <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

              {/* System Status */}
              <div style={{ display: "flex", gap: 12 }}>
                {/* Notion */}
                <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>Notion</span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 12,
                      background: memoryStatus?.notion.configured ? "rgba(34,197,94,0.12)" : OR(0.08),
                      color: memoryStatus?.notion.configured ? "#22c55e" : OR(0.4),
                    }}>{memoryStatus?.notion.configured ? "● Connected" : "Not configured"}</span>
                  </div>
                  {!memoryStatus?.notion.configured && (
                    <div style={{ color: OR(0.4), fontSize: 11, lineHeight: 1.5 }}>
                      Set <code style={{ background: OR(0.08), padding: "1px 5px", borderRadius: 3, color: O }}>NOTION_TEAM_DB_ID</code> in Secrets to activate.
                      <br />Optionally add <code style={{ background: OR(0.08), padding: "1px 5px", borderRadius: 3, color: O }}>NOTION_AGENT_DB_MAP</code> as a JSON map of agentId → database ID for per-agent databases.
                    </div>
                  )}
                  {memoryStatus?.notion.configured && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Team DB</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: 10 }}>{memoryStatus.notion.teamDbId?.slice(0, 8) ?? "—"}…</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Agent DBs</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{memoryStatus.notion.agentDbCount} configured</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ClickUp */}
                <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>ClickUp Tasks</span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 12,
                      background: memoryStatus?.clickup.configured ? "rgba(34,197,94,0.12)" : OR(0.08),
                      color: memoryStatus?.clickup.configured ? "#22c55e" : OR(0.4),
                    }}>{memoryStatus?.clickup.configured ? "● Active" : "Not configured"}</span>
                  </div>
                  {!memoryStatus?.clickup.configured && (
                    <div style={{ color: OR(0.4), fontSize: 11, lineHeight: 1.5 }}>
                      Set <code style={{ background: OR(0.08), padding: "1px 5px", borderRadius: 3, color: O }}>CLICKUP_API_TOKEN</code> and <code style={{ background: OR(0.08), padding: "1px 5px", borderRadius: 3, color: O }}>CLICKUP_LIST_ID</code> in Secrets.
                    </div>
                  )}
                  {memoryStatus?.clickup.configured && memoryStatus.clickup.listInfo && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>List</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{memoryStatus.clickup.listInfo.name}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: OR(0.35) }}>Tasks</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{memoryStatus.clickup.listInfo.taskCount}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh */}
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <button onClick={loadMemoryStatus} disabled={memoryLoading} style={{
                    background: "transparent", border: `1px solid ${OR(0.2)}`, borderRadius: 6,
                    color: OR(0.5), padding: "8px 14px", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
                  }}>{memoryLoading ? "Loading..." : "↻ Refresh"}</button>
                </div>
              </div>

              {/* ChatGPT Import */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Import ChatGPT Conversations</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 12 }}>
                  Upload your <strong style={{ color: "rgba(255,255,255,0.6)" }}>conversations.json</strong> from a ChatGPT export. Conversations will be matched to agents by name and saved to Notion.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    style={{ color: OR(0.6), fontSize: 12, flex: 1 }}
                  />
                  <button onClick={handleImport} disabled={importing || !memoryStatus?.notion.configured} style={{
                    background: importing ? OR(0.15) : `linear-gradient(135deg,${O},#ea580c)`,
                    border: "none", borderRadius: 6, color: "#fff", padding: "8px 16px",
                    cursor: importing ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  }}>{importing ? "Importing..." : "⬆ Import to Notion"}</button>
                </div>
                {!memoryStatus?.notion.configured && (
                  <div style={{ marginTop: 8, color: OR(0.4), fontSize: 11 }}>Configure Notion first to enable import.</div>
                )}
                {importResult && (
                  <div style={{ marginTop: 8, color: importResult.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 11 }}>{importResult}</div>
                )}
              </div>

              {/* Per-Agent Sync Status */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Agent Memory Sync</div>
                  {syncResult && (
                    <div style={{ color: syncResult.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 11 }}>{syncResult}</div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                  {(memoryStatus?.agents ?? []).map(a => (
                    <div key={a.agentId} style={{
                      background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.1)}`,
                      borderRadius: 8, padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{a.agentId}</span>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 10,
                          background: a.lastStatus === "success" ? "rgba(34,197,94,0.12)" : a.lastStatus === "error" ? "rgba(239,68,68,0.12)" : OR(0.08),
                          color: a.lastStatus === "success" ? "#22c55e" : a.lastStatus === "error" ? "#ef4444" : OR(0.4),
                          letterSpacing: 0.5,
                        }}>{a.lastStatus === "never" ? "never synced" : a.lastStatus}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: OR(0.35) }}>Notion syncs</span>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{a.syncAttempts}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: OR(0.35) }}>ClickUp tasks</span>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{a.clickupTasksCreated}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: OR(0.35) }}>Last sync</span>
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>{a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleTimeString() : "—"}</span>
                        </div>
                        {a.lastError && (
                          <div style={{ color: "#ef4444", fontSize: 10, lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.lastError}>{a.lastError}</div>
                        )}
                      </div>
                      <button
                        onClick={() => syncAgent(a.agentId)}
                        disabled={!!syncingAgent || !memoryStatus?.notion.configured}
                        style={{
                          width: "100%", background: "transparent",
                          border: `1px solid ${OR(0.2)}`, borderRadius: 5,
                          color: OR(0.6), padding: "5px 0", cursor: "pointer", fontSize: 11,
                        }}
                      >
                        {syncingAgent === a.agentId ? "Syncing..." : "↑ Sync to Notion"}
                      </button>
                    </div>
                  ))}
                  {!memoryStatus && !memoryLoading && (
                    <div style={{ gridColumn: "1/-1", color: OR(0.2), fontSize: 12, textAlign: "center", padding: 40 }}>Click Refresh to load memory status</div>
                  )}
                </div>
              </div>

              {/* Recent ClickUp Tasks */}
              {memoryStatus?.clickup.configured && (
                <div>
                  <div style={{ color: OR(0.4), fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Recent Agent Tasks → ClickUp</div>
                  {(memoryStatus.clickup.recentTasks ?? []).length === 0 ? (
                    <div style={{ color: OR(0.2), fontSize: 12, padding: "12px 0" }}>No agent-created ClickUp tasks yet. Tasks appear here when an agent assigns work to another agent.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {memoryStatus.clickup.recentTasks.map(t => (
                        <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer" style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: "rgba(255,255,255,0.03)", border: `1px solid ${OR(0.08)}`,
                          borderRadius: 6, padding: "10px 14px", textDecoration: "none",
                        }}>
                          <div>
                            <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{t.name}</div>
                            <div style={{ color: OR(0.4), fontSize: 10, marginTop: 2 }}>{t.fromAgent} → {t.toAgent}</div>
                          </div>
                          <span style={{ color: OR(0.3), fontSize: 10 }}>↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
