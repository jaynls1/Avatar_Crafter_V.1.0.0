import { useState, useEffect } from "react";

const STEPS = [
  {
    title: "Welcome to Your Agent World",
    emoji: "🌐",
    description:
      "This is a live 3D environment — not a website with pages. You're inside a world where your 11 AI business agents exist as animated characters, ready to guide your clients through their journey.",
    tip: "Think of it like a virtual headquarters for your business.",
    action: "Let's take a quick tour",
  },
  {
    title: "Explore the 3D Space",
    emoji: "🖱️",
    description:
      "The world is fully navigable. Drag to orbit around, scroll to zoom in or out, and pan to move through the space. Your agents are spread throughout — explore to find them all.",
    tip: "The world auto-rotates slowly when idle so it always looks alive.",
    action: "Got it, next",
    demo: [
      { icon: "🖱️", label: "Left drag", action: "Rotate view" },
      { icon: "📜", label: "Scroll", action: "Zoom in/out" },
      { icon: "⌨️", label: "Right drag", action: "Pan around" },
    ],
  },
  {
    title: "Your 11 NEXT Agents",
    emoji: "🤖",
    description:
      "Each glowing figure is one of your NEXT team agents — Atlas, Nova, Rook, Sniper, Meme, Anchor, Ignite, Haven, Index, Scribe, and Legion. Each has their own role, personality, and expertise.",
    tip: "Use the sidebar on the left to quickly jump to any agent by name.",
    action: "Next",
    demo: [
      { icon: "🔵", label: "Atlas", action: "Strategy & Vision" },
      { icon: "🟢", label: "Nova", action: "Infrastructure" },
      { icon: "🔴", label: "Rook", action: "Security & Integrity" },
      { icon: "🟡", label: "Sniper", action: "Sales & Conversion" },
    ],
  },
  {
    title: "Talk to an Agent",
    emoji: "💬",
    description:
      "Click any agent in the 3D world (or from the sidebar) to open a conversation. Each agent responds in real time using AI — grounded in their role, personality, and the NEXT mission.",
    tip: "You can type your message or tap the mic button to speak. Each conversation is saved and the agent remembers what you've discussed.",
    action: "Next",
    demo: [
      { icon: "👆", label: "Click agent", action: "Opens chat panel" },
      { icon: "🧠", label: "Real AI", action: "Live responses" },
      { icon: "🎤", label: "Mic button", action: "Voice input" },
      { icon: "⌨️", label: "Type", action: "Text input" },
    ],
  },
  {
    title: "What's Coming Next",
    emoji: "🚀",
    description:
      "This is the foundation. Here's what can be layered on to make it even more powerful for your clients:",
    tip: "Each upgrade brings your agents closer to being fully autonomous guides.",
    action: "Start Exploring",
    roadmap: [
      { icon: "✅", label: "Live AI responses", desc: "Real AI conversations powered by OpenAI — already active" },
      { icon: "🖼️", label: "Custom character art", desc: "Upload your actual NEXT agent images to the 3D avatars" },
      { icon: "🎙️", label: "Voice cloning", desc: "Give each agent their own unique voice via ElevenLabs" },
      { icon: "📦", label: "3D teaching props", desc: "Whiteboards, charts, timelines agents can interact with" },
      { icon: "🔐", label: "Member access tiers", desc: "Gate access to specific agents per client or membership level" },
    ],
  },
];

interface WalkthroughProps {
  onComplete: () => void;
}

export function Walkthrough({ onComplete }: WalkthroughProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    setVisible(false);
    setTimeout(onComplete, 200);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(1, 1, 8, 0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "rgba(8, 4, 0, 0.97)",
          border: "1px solid rgba(249,115,22,0.4)",
          borderRadius: 24,
          padding: "36px 40px",
          maxWidth: 560,
          width: "100%",
          boxShadow: "0 0 60px rgba(249,115,22,0.18), 0 0 120px rgba(249,115,22,0.08)",
          position: "relative",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, justifyContent: "center" }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 6,
                height: 6,
                borderRadius: 6,
                background: i === step ? "#F97316" : i < step ? "#FB923C" : "rgba(255,255,255,0.12)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Emoji */}
        <div style={{ fontSize: 52, textAlign: "center", marginBottom: 16 }}>
          {current.emoji}
        </div>

        {/* Title */}
        <h2
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          {current.title}
        </h2>

        {/* Description */}
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 14,
            lineHeight: 1.7,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {current.description}
        </p>

        {/* Demo grid */}
        {"demo" in current && current.demo && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {current.demo.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.22)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{item.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Code block */}
        {"code" in current && current.code && (
          <pre
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 11,
              color: "#FB923C",
              overflowX: "auto",
              marginBottom: 16,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {current.code}
          </pre>
        )}

        {/* Roadmap */}
        {"roadmap" in current && current.roadmap && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {current.roadmap.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div>
                  <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tip */}
        <div
          style={{
            background: "rgba(249,115,22,0.07)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 24,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.5 }}>
            {current.tip}
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={skip}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            Skip tour
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                background: "linear-gradient(135deg, #F97316, #FB923C)",
                border: "none",
                color: "white",
                padding: "10px 24px",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 0 24px rgba(249,115,22,0.45)",
              }}
            >
              {isLast ? "🚀 Start Exploring" : current.action}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            color: "rgba(255,255,255,0.25)",
            fontSize: 11,
          }}
        >
          {step + 1} / {STEPS.length}
        </div>
      </div>
    </div>
  );
}
