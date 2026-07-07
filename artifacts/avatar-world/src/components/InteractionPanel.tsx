import { useState, useEffect, useRef } from "react";
import { Agent } from "../agents";

interface Message {
  from: "user" | "agent";
  text: string;
  timestamp: number;
  streaming?: boolean;
}

interface InteractionPanelProps {
  agent: Agent | null;
  isSpeaking: boolean;
  onStartSpeaking: () => void;
  onStopSpeaking: () => void;
  onClose: () => void;
  activeSpecialtyFilter: string | null;
  onSpecialtyFilter: (specialty: string | null) => void;
}

export function InteractionPanel({
  agent,
  onClose,
  activeSpecialtyFilter,
  onSpecialtyFilter,
}: InteractionPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioOverflows, setBioOverflows] = useState(false);
  const [bioFullHeight, setBioFullHeight] = useState<number | null>(null);
  const [bioCopied, setBioCopied] = useState(false);
  const [convCopied, setConvCopied] = useState(false);
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState<number | null>(null);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) return;
    const stored = localStorage.getItem(`bio-expanded:${agent.id}`);
    setBioExpanded(stored === "true");
    setBioOverflows(false);
    setBioFullHeight(null);
    setBioCopied(false);
  }, [agent]);

  const toggleBioExpanded = () => {
    if (!agent) return;
    setBioExpanded((v) => {
      const next = !v;
      localStorage.setItem(`bio-expanded:${agent.id}`, String(next));
      return next;
    });
  };

  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    const fullHeight = el.scrollHeight;
    setBioFullHeight(fullHeight);
    const collapsedHeight = parseFloat(getComputedStyle(el).lineHeight) * 2;
    setBioOverflows(fullHeight > collapsedHeight + 2);
  }, [agent]);

  const historyKey = (agentId: string) => `chat-history:${agentId}`;

  interface StoredSession {
    messages: Message[];
    conversationId: number | null;
  }

  const saveHistory = (agentId: string, msgs: Message[], convId: number | null) => {
    const toSave = msgs.filter((m) => !m.streaming);
    try {
      const session: StoredSession = { messages: toSave, conversationId: convId };
      localStorage.setItem(historyKey(agentId), JSON.stringify(session));
    } catch {}
  };

  const loadHistory = (agentId: string): StoredSession | null => {
    try {
      const raw = localStorage.getItem(historyKey(agentId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return { messages: parsed.messages, conversationId: parsed.conversationId ?? null };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { messages: parsed, conversationId: null };
      }
    } catch {}
    return null;
  };

  const currentAgentIdRef = useRef<string | null>(null);

  const createNewConversation = async (agentName: string, agentId: string): Promise<number | null> => {
    try {
      const r = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat with ${agentName}`, agentId }),
      });
      if (!r.ok) return null;
      const conv = await r.json();
      return typeof conv?.id === "number" ? conv.id : null;
    } catch {
      return null;
    }
  };

  const clearHistory = async () => {
    if (!agent) return;
    localStorage.removeItem(historyKey(agent.id));
    const greeting: Message = { from: "agent", text: agent.greeting, timestamp: Date.now() };
    setMessages([greeting]);
    setConversationId(null);
    const newId = await createNewConversation(agent.name, agent.id);
    setConversationId(newId);
    saveHistory(agent.id, [greeting], newId);
  };

  useEffect(() => {
    if (!agent) return;

    currentAgentIdRef.current = agent.id;

    const saved = loadHistory(agent.id);
    if (saved && saved.conversationId !== null) {
      setMessages(saved.messages);
      setConversationId(saved.conversationId);
    } else if (saved) {
      setMessages(saved.messages);
      setConversationId(null);
      const targetId = agent.id;
      createNewConversation(agent.name, agent.id).then((newId) => {
        if (currentAgentIdRef.current !== targetId) return;
        setConversationId(newId);
        saveHistory(targetId, saved.messages, newId);
      });
    } else {
      const greeting: Message = { from: "agent", text: agent.greeting, timestamp: Date.now() };
      setMessages([greeting]);
      setConversationId(null);
      const targetId = agent.id;
      createNewConversation(agent.name, agent.id).then((newId) => {
        if (currentAgentIdRef.current !== targetId) return;
        setConversationId(newId);
        saveHistory(targetId, [greeting], newId);
      });
    }
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!agent || messages.length === 0) return;
    if (messages.some((m) => m.streaming)) return;
    saveHistory(agent.id, messages, conversationId);
  }, [messages, agent, conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !agent || !conversationId || isStreaming) return;

    const text = input.trim();
    setInput("");

    const userMsg: Message = { from: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    const placeholderMsg: Message = {
      from: "agent",
      text: "",
      timestamp: Date.now(),
      streaming: true,
    };
    setMessages((prev) => [...prev, placeholderMsg]);
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: ctrl.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const parsed = JSON.parse(json);
            if (parsed.content) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.streaming) {
                  next[next.length - 1] = { ...last, text: last.text + parsed.content };
                }
                return next;
              });
            } else if (parsed.done) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.streaming) {
                  next[next.length - 1] = { ...last, streaming: false };
                }
                return next;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last?.streaming) return prev;
        if (err.name === "AbortError") {
          if (last.text.trim()) {
            next[next.length - 1] = { ...last, streaming: false };
          } else {
            next.pop();
          }
        } else {
          next[next.length - 1] = {
            ...last,
            text: "Something went wrong. Please try again.",
            streaming: false,
          };
        }
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const copyConversation = () => {
    if (!agent || messages.length === 0) return;
    const text = messages
      .filter((msg) => !msg.streaming && msg.text.trim() !== "")
      .map((msg) => {
        const speaker = msg.from === "user" ? "You" : agent.name;
        return `${speaker}: ${msg.text}`;
      })
      .join("\n\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setConvCopied(true);
      setTimeout(() => setConvCopied(false), 1500);
    }).catch(() => {
      alert("Could not copy to clipboard. Please check browser permissions.");
    });
  };

  const copyMessage = (index: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgIndex(index);
      setTimeout(() => setCopiedMsgIndex((prev) => (prev === index ? null : prev)), 1500);
    }).catch(() => {});
  };

  const copyBio = () => {
    if (!agent?.description) return;
    navigator.clipboard.writeText(agent.description).then(() => {
      setBioCopied(true);
      setTimeout(() => setBioCopied(false), 1500);
    }).catch(() => {});
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    setListening(true);
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  if (!agent) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "380px",
        background: "rgba(5, 5, 20, 0.92)",
        backdropFilter: "blur(20px)",
        borderLeft: `1px solid ${agent.color}40`,
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: `1px solid ${agent.color}30`,
          background: `linear-gradient(135deg, ${agent.color}15, transparent)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${agent.color}, ${agent.accentColor})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: `0 0 15px ${agent.color}60`,
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{agent.name}</div>
                  <button
                    onClick={() =>
                      onSpecialtyFilter(
                        activeSpecialtyFilter === agent.specialty ? null : agent.specialty
                      )
                    }
                    title={
                      activeSpecialtyFilter === agent.specialty
                        ? "Click to clear specialty filter"
                        : `Click to highlight all ${agent.specialty} agents`
                    }
                    style={{
                      padding: "2px 10px",
                      borderRadius: 20,
                      background:
                        activeSpecialtyFilter === agent.specialty
                          ? `${agent.color}55`
                          : `${agent.color}25`,
                      border: `1px solid ${
                        activeSpecialtyFilter === agent.specialty
                          ? agent.accentColor
                          : `${agent.color}50`
                      }`,
                      color: agent.accentColor,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s",
                      boxShadow:
                        activeSpecialtyFilter === agent.specialty
                          ? `0 0 8px ${agent.color}60`
                          : "none",
                    }}
                  >
                    {activeSpecialtyFilter === agent.specialty && (
                      <span style={{ fontSize: 9, opacity: 0.8 }}>◉</span>
                    )}
                    {agent.specialty}
                  </button>
                </div>
                <div style={{ color: agent.accentColor, fontSize: 12 }}>{agent.title}</div>
              </div>
            </div>
            {agent.description && (
              <div style={{ marginTop: 8, maxWidth: 260 }}>
                <div
                  ref={bioRef}
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    maxHeight: bioExpanded
                      ? `${bioFullHeight ?? 9999}px`
                      : "3em",
                    transition: "max-height 0.35s ease",
                  }}
                >
                  {agent.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {(bioOverflows || bioExpanded) && (
                    <button
                      onClick={toggleBioExpanded}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 11,
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationColor: "rgba(255,255,255,0.2)",
                        lineHeight: 1,
                      }}
                    >
                      {bioExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  <button
                    onClick={copyBio}
                    title="Copy bio to clipboard"
                    style={{
                      background: bioCopied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${bioCopied ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: 6,
                      padding: "2px 7px",
                      color: bioCopied ? "#10B981" : "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      lineHeight: 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {bioCopied ? (
                      <>✓ Copied!</>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isStreaming ? "#10B981" : "#6C63FF",
                  boxShadow: isStreaming ? "0 0 8px #10B981" : "0 0 8px #6C63FF",
                  animation: isStreaming ? "pulse 0.5s infinite" : "none",
                }}
              />
              <span style={{ color: "#888", fontSize: 12 }}>
                {isStreaming ? "Responding..." : "Ready to talk"}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredMsgIndex(i)}
            onMouseLeave={() => setHoveredMsgIndex(null)}
            style={{
              display: "flex",
              flexDirection: msg.from === "user" ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <div
              style={{
                maxWidth: "82%",
                padding: "12px 16px",
                borderRadius: msg.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background:
                  msg.from === "user"
                    ? "rgba(108,99,255,0.3)"
                    : `linear-gradient(135deg, ${agent.color}20, rgba(255,255,255,0.05))`,
                border: `1px solid ${msg.from === "user" ? "rgba(108,99,255,0.4)" : agent.color + "30"}`,
                color: "white",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {msg.text}
              {msg.streaming && msg.text === "" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: agent.accentColor,
                        animation: `bounce 1s ease-in-out ${j * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
              {msg.streaming && msg.text !== "" && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: "1em",
                    background: agent.accentColor,
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                    animation: "blink 0.7s step-end infinite",
                  }}
                />
              )}
            </div>
            {!msg.streaming && msg.text.trim() !== "" && (
              <button
                onClick={() => copyMessage(i, msg.text)}
                title="Copy message"
                style={{
                  flexShrink: 0,
                  background: copiedMsgIndex === i ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${copiedMsgIndex === i ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 6,
                  padding: "4px 6px",
                  color: copiedMsgIndex === i ? "#10B981" : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  opacity: hoveredMsgIndex === i || copiedMsgIndex === i ? 1 : 0,
                  pointerEvents: hoveredMsgIndex === i || copiedMsgIndex === i ? "auto" : "none",
                }}
              >
                {copiedMsgIndex === i ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>Copied!</span>
                  </>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Specialty badge */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: `1px solid ${agent.color}20`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() =>
            onSpecialtyFilter(
              activeSpecialtyFilter === agent.specialty ? null : agent.specialty
            )
          }
          title={
            activeSpecialtyFilter === agent.specialty
              ? "Click to clear specialty filter"
              : `Highlight all ${agent.specialty} agents in the world`
          }
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            background:
              activeSpecialtyFilter === agent.specialty
                ? `${agent.color}45`
                : `${agent.color}20`,
            border: `1px solid ${
              activeSpecialtyFilter === agent.specialty
                ? agent.accentColor
                : `${agent.color}40`
            }`,
            color: agent.accentColor,
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.2s",
            boxShadow:
              activeSpecialtyFilter === agent.specialty
                ? `0 0 8px ${agent.color}50`
                : "none",
          }}
        >
          {activeSpecialtyFilter === agent.specialty && (
            <span style={{ fontSize: 9, opacity: 0.8 }}>◉</span>
          )}
          {agent.specialty}
        </button>
        {activeSpecialtyFilter === agent.specialty && (
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
            Highlighting similar agents
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={clearHistory}
            title="Start a new conversation"
            disabled={isStreaming}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "3px 9px",
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: isStreaming ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.2s",
              opacity: isStreaming ? 0.5 : 1,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.96"/>
            </svg>
            New chat
          </button>
          <button
            onClick={copyConversation}
            title="Copy conversation to clipboard"
            style={{
              background: convCopied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${convCopied ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 6,
              padding: "3px 9px",
              color: convCopied ? "#10B981" : "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.2s",
            }}
          >
            {convCopied ? (
              <>✓ Copied!</>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px", borderTop: `1px solid ${agent.color}30` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={startListening}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: listening
                ? "rgba(16,185,129,0.3)"
                : "rgba(255,255,255,0.06)",
              border: `1px solid ${listening ? "#10B981" : "rgba(255,255,255,0.15)"}`,
              color: listening ? "#10B981" : "#888",
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            title="Voice input"
          >
            {listening ? "🔴" : "🎤"}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isStreaming && sendMessage()}
            placeholder="Ask your agent anything..."
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${agent.color}40`,
              color: "white",
              fontSize: 14,
              outline: "none",
              opacity: isStreaming ? 0.6 : 1,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              background:
                input.trim() && !isStreaming
                  ? `linear-gradient(135deg, ${agent.color}, ${agent.accentColor})`
                  : "rgba(255,255,255,0.05)",
              border: "none",
              color: "white",
              cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
              fontSize: 16,
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
