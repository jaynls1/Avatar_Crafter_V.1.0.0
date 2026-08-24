import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Text, useTexture } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import WebGLErrorBoundary from "./components/WebGLErrorBoundary";
import Nova3D from "./components/Nova3D";
import novaImg from "./assets/nova_smiling.jpg";

// ─── HQ Screen helpers ────────────────────────────────────────────────────────
const HQ_MESSAGES = [
  "WHERE HEART MEETS AUTOMATION",
  "BUILD · GROW · AUTOMATE",
  "POWERED BY AI, DRIVEN BY PURPOSE",
  "YOUR NEXT LEVEL STARTS HERE",
];

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

/** Renders a direct image URL as a texture on the screen surface */
function ScreenImage({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh>
      <planeGeometry args={[14.2, 5.3]} />
      <meshStandardMaterial map={texture} roughness={0.05} />
    </mesh>
  );
}

/** Renders any embeddable URL (YouTube, Loom, mp4, etc.) via an iframe */
function ScreenEmbed({ url, onClick }: { url: string; onClick: () => void }) {
  return (
    <Html
      position={[0, 0, 0.06]}
      transform
      distanceFactor={9}
      occlude={false}
      style={{ pointerEvents: "auto" }}
    >
      {/* 900 × 336 px ≈ 14.2 × 5.3 world-unit aspect ratio */}
      <iframe
        src={url}
        width={900}
        height={336}
        style={{ border: "none", borderRadius: 4, display: "block" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {/* Invisible click-pass-through layer so OrbitControls still captures drag */}
      <div
        onClick={onClick}
        style={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: -1 }}
      />
    </Html>
  );
}

const W = 26;
const H = 9;
const D = 22;

// ─── Greeting / wing state types ─────────────────────────────────────────────
type WingChoice = "A" | "B" | null;
type GreetingPhase = "waiting" | "visible" | "dismissing" | "gone";

// ─── Static wing metadata ────────────────────────────────────────────────────
const WING_DATA = {
  A: {
    title: "WING A",
    tagline: "Build & Scale",
    description:
      "Where strategy, creativity, and tech come together to grow your business.",
    color: "#4a9eff",
    agents: [
      { name: "Atlas",  role: "Chief AI Officer" },
      { name: "Nova",   role: "Workshop & Build"  },
      { name: "Sniper", role: "Sales & Consulting" },
      { name: "Meme",   role: "Creative Studio"    },
      { name: "Scribe", role: "Knowledge Library"  },
      { name: "Indy",   role: "Systems & Data"     },
    ],
    navigate: "/hallway/left",
    side: "left" as const,
  },
  B: {
    title: "WING B",
    tagline: "Community & Support",
    description:
      "Operations, security, and the people side of your business.",
    color: "#22d3ee",
    agents: [
      { name: "Rook",      role: "Security & Legal"   },
      { name: "Iggy",      role: "Innovation Garage"  },
      { name: "Anchor",    role: "Operations"          },
      { name: "Haven",     role: "Member Success"      },
      { name: "Breakroom", role: "Social Lounge"       },
    ],
    navigate: "/hallway/right",
    side: "right" as const,
  },
};

// ─── Simple typewriter hook ───────────────────────────────────────────────────
function useTypewriter(text: string, speed = 22, active = true): string {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, active]);
  return displayed;
}

// ─── 3D lobby geometry ───────────────────────────────────────────────────────

function MarbleFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#c0b8ae" roughness={0.25} metalness={0.06} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => i - 7).map(n => (
        <mesh key={`gx${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[n * 2, 0.001, 0]}>
          <planeGeometry args={[0.03, D]} />
          <meshStandardMaterial color="#9a9088" roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => i - 6).map(n => (
        <mesh key={`gz${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, n * 2]}>
          <planeGeometry args={[W, 0.03]} />
          <meshStandardMaterial color="#9a9088" roughness={0.4} />
        </mesh>
      ))}
      {/* Floor emblem */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 3]}>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#c8a050" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 3]}>
        <circleGeometry args={[3.0, 64]} />
        <meshStandardMaterial color="#1a1420" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 3]}>
        <ringGeometry args={[2.4, 2.6, 64]} />
        <meshStandardMaterial color="#c8a050" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

function DarkCeiling() {
  const pendantPositions: [number, number, number][] = [
    [-8, 0, -6], [8, 0, -6],
    [-8, 0, 2],  [8, 0, 2],
    [0, 0, -6],
  ];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#080810" roughness={0.95} />
      </mesh>
      {pendantPositions.map(([x, , z], i) => (
        <group key={i} position={[x, H, z]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 1.2, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, -0.7, 0]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshStandardMaterial color="#ffe8cc" emissive="#ffe8cc" emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0, -0.7, 0]} intensity={20} distance={12} color="#fff5e0" />
        </group>
      ))}
    </group>
  );
}

function LobbyWalls() {
  const archW = 5.5;
  const archH = 3.8;

  return (
    <group>
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H - (H - archH) / 2, 0]}>
        <planeGeometry args={[D, H - archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, archH / 2, D / 2 - (D / 2 - archW / 2) / 2]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, archH / 2, -(D / 2 - (D / 2 - archW / 2) / 2)]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H - (H - archH) / 2, 0]}>
        <planeGeometry args={[D, H - archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, archH / 2, D / 2 - (D / 2 - archW / 2) / 2]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, archH / 2, -(D / 2 - (D / 2 - archW / 2) / 2)]}>
        <planeGeometry args={[D / 2 - archW / 2, archH]} />
        <meshStandardMaterial color="#131020" roughness={0.9} />
      </mesh>
    </group>
  );
}

function MagicScreen({ onClick, screenUrl }: { onClick: () => void; screenUrl?: string | null }) {
  const matRef  = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const [msgIdx, setMsgIdx]   = useState(0);
  const t = useRef(0);

  // Cycle sub-message every 3.5 s when showing the branded placeholder
  useEffect(() => {
    if (screenUrl) return;
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % HQ_MESSAGES.length), 3500);
    return () => clearInterval(iv);
  }, [screenUrl]);

  useFrame((_, delta) => {
    t.current += delta * 0.045;
    if (matRef.current && !screenUrl) {
      matRef.current.color.setHSL(t.current % 1, 0.55, 0.08);
      matRef.current.emissive.setHSL(t.current % 1, 0.65, hovered ? 0.22 : 0.12);
    }
    if (lightRef.current) {
      if (screenUrl) {
        lightRef.current.color.set("#fff5e0");
        lightRef.current.intensity = 8;
      } else {
        lightRef.current.color.setHSL(t.current % 1, 0.9, 0.55);
        lightRef.current.intensity = 10 + Math.sin(t.current * 28) * 4;
      }
    }
  });

  const hasImage = !!screenUrl && isImageUrl(screenUrl);
  const hasEmbed = !!screenUrl && !isImageUrl(screenUrl);

  return (
    <group position={[0, 4.2, -D / 2 + 0.25]}>
      {/* Gold border frame */}
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[15.4, 6.4, 0.12]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Inner dark bezel */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[15, 6, 0.1]} />
        <meshStandardMaterial color="#05040c" roughness={0.9} />
      </mesh>

      {/* ── Branded placeholder (no URL) ── */}
      {!screenUrl && (
        <>
          <mesh
            onClick={onClick}
            onPointerOver={() => { setHovered(true);  document.body.style.cursor = "pointer"; }}
            onPointerOut= {() => { setHovered(false); document.body.style.cursor = "default"; }}
          >
            <planeGeometry args={[14.2, 5.3]} />
            <meshStandardMaterial ref={matRef} roughness={0.05} metalness={0} />
          </mesh>
          <Text position={[0, 1.1, 0.02]} fontSize={0.62} color="#ffffff"
            anchorX="center" anchorY="middle" letterSpacing={0.35}
            outlineWidth={0.025} outlineColor="#000">
            NEXT LEVEL SOLUTIONS
          </Text>
          <Text position={[0, 0.25, 0.02]} fontSize={0.22} color="#c8a050"
            anchorX="center" anchorY="middle" letterSpacing={0.14}>
            WHERE HEART MEETS AUTOMATION
          </Text>
          {/* Thin separator */}
          <mesh position={[0, -0.12, 0.02]}>
            <planeGeometry args={[8, 0.018]} />
            <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.6} />
          </mesh>
          {/* Cycling sub-message */}
          <Text key={msgIdx} position={[0, -0.52, 0.02]} fontSize={0.17} color="#9090b0"
            anchorX="center" anchorY="middle" letterSpacing={0.12}>
            {HQ_MESSAGES[msgIdx]}
          </Text>
          {hovered && (
            <Text position={[0, -1.3, 0.02]} fontSize={0.16} color="#ffffff"
              anchorX="center" anchorY="middle">
              ▶ Enter Theatre
            </Text>
          )}
        </>
      )}

      {/* ── Direct image texture ── */}
      {hasImage && (
        <group
          onClick={onClick}
          onPointerOver={() => { setHovered(true);  document.body.style.cursor = "pointer"; }}
          onPointerOut= {() => { setHovered(false); document.body.style.cursor = "default"; }}
        >
          <ScreenImage url={screenUrl!} />
        </group>
      )}

      {/* ── Iframe embed ── */}
      {hasEmbed && (
        <>
          <mesh>
            <planeGeometry args={[14.2, 5.3]} />
            <meshStandardMaterial color="#030208" roughness={1} />
          </mesh>
          <ScreenEmbed url={screenUrl!} onClick={onClick} />
        </>
      )}

      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={10} distance={22} />
    </group>
  );
}

function HallwayArch({ side, label, subLabel, onClick, highlighted = false }: {
  side: "left" | "right";
  label: string;
  subLabel: string;
  onClick: () => void;
  highlighted?: boolean;
}) {
  const x = side === "left" ? -W / 2 + 0.1 : W / 2 - 0.1;
  const rotY = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftPostRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightPostRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const baseIntensity = highlighted
      ? 0.85 + Math.sin(t.current * 2.8) * 0.35   // strong, fast pulse when highlighted
      : (hovered ? 0.65 : 0.22) + Math.sin(t.current * 1.8) * 0.1;

    if (glowRef.current) {
      glowRef.current.emissiveIntensity = baseIntensity;
      if (highlighted) {
        glowRef.current.emissive.set("#ffd070");
      }
    }
    if (leftPostRef.current) leftPostRef.current.emissiveIntensity = highlighted ? baseIntensity * 0.9 : 0.3;
    if (rightPostRef.current) rightPostRef.current.emissiveIntensity = highlighted ? baseIntensity * 0.9 : 0.3;
  });

  const archW = 5.5;
  const archH = 3.8;

  return (
    <group position={[x, 0, 0]} rotation={[0, rotY, 0]}>
      {/* Top beam */}
      <mesh position={[0, archH + 0.12, 0]}>
        <boxGeometry args={[archW + 0.5, 0.24, 0.18]} />
        <meshStandardMaterial ref={glowRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Left post */}
      <mesh position={[-(archW / 2 + 0.12), archH / 2, 0]}>
        <boxGeometry args={[0.24, archH + 0.24, 0.18]} />
        <meshStandardMaterial ref={leftPostRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Right post */}
      <mesh position={[(archW / 2 + 0.12), archH / 2, 0]}>
        <boxGeometry args={[0.24, archH + 0.24, 0.18]} />
        <meshStandardMaterial ref={rightPostRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Portal void */}
      <mesh
        position={[0, archH / 2, -0.6]}
        onClick={onClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[archW, archH]} />
        <meshStandardMaterial
          color={highlighted ? "#0d1a10" : hovered ? "#0d1a0d" : "#060408"}
          roughness={1}
          emissive={highlighted ? "#001a04" : "#000000"}
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>
      {/* Label */}
      <Text position={[0, archH + 0.6, 0]} fontSize={0.28} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.15} outlineWidth={0.01} outlineColor="#000">
        {label}
      </Text>
      <Text position={[0, archH + 0.22, 0]} fontSize={0.15} color={highlighted ? "#88ffaa" : hovered ? "#aaffaa" : "#666"} anchorX="center" anchorY="middle">
        {highlighted ? "← Recommended →" : hovered ? "Enter →" : subLabel}
      </Text>
      {/* Floor guide */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -3]}>
        <planeGeometry args={[archW, 6]} />
        <meshStandardMaterial color={highlighted ? "#0e1f0e" : "#1a1a2a"} roughness={0.9} />
      </mesh>
    </group>
  );
}

function LobbyColumns() {
  const cols: [number, number, number][] = [
    [-9, 0, -7], [9, 0, -7],
    [-9, 0, 1],  [9, 0, 1],
  ];
  return (
    <>
      {cols.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.26, H, 20]} />
            <meshStandardMaterial color="#1e1830" roughness={0.7} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.36, 20]} />
            <meshStandardMaterial color="#14102a" roughness={0.8} />
          </mesh>
          <mesh position={[0, H - 0.18, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.36, 20]} />
            <meshStandardMaterial color="#14102a" roughness={0.8} />
          </mesh>
          <pointLight position={[0, 0.5, 0]} intensity={2} distance={3} color="#c8a050" />
        </group>
      ))}
    </>
  );
}

// ─── Nova Greeting overlay ────────────────────────────────────────────────────

const GREETING_TEXT =
  "Welcome to Next Level HQ. I'm Nova. Are you here to build a business, grow a community, or explore what's possible with AI?";

function NovaGreeting({
  phase,
  onChoose,
  onDismiss,
}: {
  phase: GreetingPhase;
  onChoose: (wing: WingChoice) => void;
  onDismiss: () => void;
}) {
  const typed = useTypewriter(GREETING_TEXT, 22, phase === "visible");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatConvId, setChatConvId] = useState<number | null>(null);
  const [chatError, setChatError] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{
    from: "nova" | "user";
    text: string;
    streaming?: boolean;
  }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => chatAbortRef.current?.abort();
  }, []);

  async function openChat() {
    setChatOpen(true);
    setChatError("");
    if (chatConvId || chatLoading) return;

    setChatLoading(true);
    try {
      const response = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chat with Nova", agentId: "nova" }),
      });
      const conversation = await response.json();
      if (!response.ok || typeof conversation.id !== "number") {
        throw new Error(conversation.error || "Nova is unavailable right now.");
      }
      setChatConvId(conversation.id);
      setChatMessages([{
        from: "nova",
        text: "I'm here. Ask me anything about NEXT, or tell me what you're building.",
      }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Nova is unavailable right now.");
    } finally {
      setChatLoading(false);
    }
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || !chatConvId || chatSending) return;

    setChatInput("");
    setChatSending(true);
    setChatMessages((previous) => [
      ...previous,
      { from: "user", text },
      { from: "nova", text: "", streaming: true },
    ]);

    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const response = await fetch(`/api/openai/conversations/${chatConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error("Nova could not answer right now.");
      }

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
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setChatMessages((previous) => previous.map((message, index) =>
                index === previous.length - 1 ? { ...message, streaming: false } : message
              ));
            } else if (data.content) {
              setChatMessages((previous) => previous.map((message, index) =>
                index === previous.length - 1
                  ? { ...message, text: message.text + data.content }
                  : message
              ));
            }
          } catch {
            // Ignore incomplete SSE chunks; the next chunk completes the JSON.
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setChatMessages((previous) => previous.map((message, index) =>
          index === previous.length - 1
            ? { ...message, text: "Something interrupted — try again.", streaming: false }
            : message
        ));
      }
    } finally {
      setChatSending(false);
    }
  }

  if (phase === "waiting" || phase === "gone") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: "0 16px 24px",
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <div
        className={`nova-greeting${phase === "dismissing" ? " dismissing" : ""}`}
        style={{
          pointerEvents: "auto",
          maxWidth: 560,
          width: "100%",
          background: "rgba(10, 8, 22, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(200,160,80,0.25)",
          borderRadius: 16,
          padding: "20px 22px 18px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 24px rgba(74,158,255,0.12)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Nova avatar */}
          <div style={{
            flexShrink: 0,
            width: 56,
            height: 56,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid #4a9eff",
            boxShadow: "0 0 14px rgba(74,158,255,0.5)",
          }}>
            <img
              src={novaImg}
              alt="Nova"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
                filter: "brightness(1.05) saturate(1.1)",
              }}
            />
          </div>

          {/* Name + text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#4a9eff",
                letterSpacing: "0.5px",
              }}>NOVA</span>
              <span style={{
                fontSize: 10,
                color: "#4a9eff",
                background: "rgba(74,158,255,0.15)",
                border: "1px solid rgba(74,158,255,0.3)",
                borderRadius: 4,
                padding: "1px 6px",
                letterSpacing: "0.5px",
              }}>AI GUIDE</span>
            </div>
            <p style={{
              fontSize: 14,
              color: "#ddd8cc",
              lineHeight: 1.55,
              minHeight: 44,
              margin: 0,
            }}>
              {typed}
              <span style={{
                display: "inline-block",
                width: 2,
                height: "1em",
                background: "#4a9eff",
                marginLeft: 2,
                verticalAlign: "middle",
                opacity: typed.length < GREETING_TEXT.length ? 1 : 0,
                transition: "opacity 0.15s",
              }} />
            </p>
          </div>

          {/* Dismiss X */}
          <button
            onClick={onDismiss}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 2px",
              marginTop: -2,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#aaa")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* Working Nova chat, available before choosing a wing */}
        {chatOpen && (
          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: "rgba(74,158,255,0.06)",
            border: "1px solid rgba(74,158,255,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#8dbfff", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>CHAT WITH NOVA</span>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13 }}
              >
                Hide
              </button>
            </div>
            {chatLoading ? (
              <div style={{ color: "#888", fontSize: 12, padding: "8px 0" }}>Connecting to Nova…</div>
            ) : (
              <>
                <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, marginBottom: 8 }}>
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      style={{
                        alignSelf: message.from === "user" ? "flex-end" : "flex-start",
                        maxWidth: "88%",
                        padding: "7px 10px",
                        borderRadius: message.from === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
                        background: message.from === "user" ? "rgba(74,158,255,0.2)" : "rgba(255,255,255,0.07)",
                        color: "#ddd8cc",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {message.text || "…"}
                      {message.streaming && <span style={{ opacity: 0.6 }}>▍</span>}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendChat();
                    }}
                    placeholder="Ask Nova anything…"
                    disabled={!chatConvId || chatSending}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 7,
                      background: "rgba(0,0,0,0.25)",
                      color: "#eee",
                      padding: "8px 10px",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim() || !chatConvId || chatSending}
                    style={{
                      border: "none",
                      borderRadius: 7,
                      padding: "0 12px",
                      background: chatInput.trim() && chatConvId && !chatSending ? "#4a9eff" : "rgba(255,255,255,0.1)",
                      color: "white",
                      cursor: chatInput.trim() && chatConvId && !chatSending ? "pointer" : "default",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {chatSending ? "…" : "Send"}
                  </button>
                </div>
              </>
            )}
            {chatError && <div style={{ color: "#ff9898", fontSize: 11, marginTop: 8 }}>{chatError}</div>}
          </div>
        )}

        {/* Choice buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <button
            className="nova-choice-btn"
            onClick={() => onChoose("A")}
          >
            <span style={{ fontSize: 15, marginRight: 8 }}>🏢</span>
            Build a Business
            <span style={{ float: "right", fontSize: 11, color: "#666", marginTop: 1 }}>Wing A →</span>
          </button>
          <button
            className="nova-choice-btn"
            onClick={() => onChoose("B")}
          >
            <span style={{ fontSize: 15, marginRight: 8 }}>🌱</span>
            Grow a Community
            <span style={{ float: "right", fontSize: 11, color: "#666", marginTop: 1 }}>Wing B →</span>
          </button>
          <button
            className="nova-choice-btn"
            onClick={() => onChoose("A")}
          >
            <span style={{ fontSize: 15, marginRight: 8 }}>✨</span>
            Explore what's possible with AI
            <span style={{ float: "right", fontSize: 11, color: "#666", marginTop: 1 }}>Wing A →</span>
          </button>
          <button
            className="nova-choice-btn"
            onClick={openChat}
            style={{ borderColor: "rgba(74,158,255,0.35)" }}
          >
            <span style={{ fontSize: 15, marginRight: 8 }}>💬</span>
            Chat with Nova
            <span style={{ float: "right", fontSize: 11, color: "#666", marginTop: 1 }}>Ask me anything →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Wing tooltip overlay ─────────────────────────────────────────────────────

function WingTooltip({
  wing,
  onNavigate,
  onDismiss,
}: {
  wing: WingChoice;
  onNavigate: (path: string) => void;
  onDismiss: () => void;
}) {
  if (!wing) return null;
  const data = WING_DATA[wing];
  const isLeft = data.side === "left";

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        ...(isLeft ? { left: 20 } : { right: 20 }),
        transform: "translateY(-50%)",
        zIndex: 30,
        pointerEvents: "auto",
        // CSS var for slide-in direction
        ["--tip-from" as string]: isLeft ? "-30px" : "30px",
      }}
    >
      <div
        className="nova-tooltip"
        style={{
          width: 230,
          background: "rgba(10, 8, 22, 0.94)",
          backdropFilter: "blur(18px)",
          border: `1px solid ${data.color}40`,
          borderRadius: 14,
          boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 20px ${data.color}22`,
          overflow: "hidden",
        }}
      >
        {/* Wing indicator arrow — points outward toward the arch */}
        <div style={{
          position: "absolute",
          top: "50%",
          ...(isLeft ? { left: -8 } : { right: -8 }),
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          ...(isLeft
            ? { borderRight: `8px solid ${data.color}60` }
            : { borderLeft: `8px solid ${data.color}60` }),
        }} />

        {/* Accent bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${data.color}, transparent)`,
        }} />

        <div style={{ padding: "14px 16px" }}>
          {/* Title row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: data.color, letterSpacing: "1.5px", fontWeight: 700 }}>
                {data.title}
              </div>
              <div style={{ fontSize: 13, color: "#e8e4d8", fontWeight: 600, marginTop: 1 }}>
                {data.tagline}
              </div>
            </div>
            <button
              onClick={onDismiss}
              style={{
                background: "none", border: "none", color: "#555",
                cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0,
                marginTop: -2,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#888")}
              onMouseLeave={e => (e.currentTarget.style.color = "#555")}
            >×</button>
          </div>

          <p style={{ fontSize: 11, color: "#888", lineHeight: 1.5, margin: "6px 0 12px" }}>
            {data.description}
          </p>

          {/* Agent list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            {data.agents.map(a => (
              <div key={a.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#d8d4cc" }}>{a.name}</span>
                <span style={{ fontSize: 11, color: "#666" }}>{a.role}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            className="nova-wing-enter-btn"
            style={{ width: "100%" }}
            onClick={() => onNavigate(data.navigate)}
          >
            Enter {data.title} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [, navigate] = useLocation();

  // HQ screen URL (configurable via /api/hq-screen)
  const [screenUrl, setScreenUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/hq-screen")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.screenUrl) setScreenUrl(d.screenUrl); })
      .catch(() => {});
  }, []);

  // Greeting state
  const [greetingPhase, setGreetingPhase] = useState<GreetingPhase>("waiting");
  const [selectedWing, setSelectedWing] = useState<WingChoice>(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  // Trigger greeting 2.5 s after mount
  useEffect(() => {
    const t = setTimeout(() => setGreetingPhase("visible"), 2500);
    return () => clearTimeout(t);
  }, []);

  function handleChoose(wing: WingChoice) {
    setGreetingPhase("dismissing");
    setSelectedWing(wing);
    setTooltipDismissed(false);
    setTimeout(() => setGreetingPhase("gone"), 320);
  }

  function handleDismissGreeting() {
    setGreetingPhase("dismissing");
    setTimeout(() => setGreetingPhase("gone"), 320);
  }

  const showTooltip = selectedWing !== null && !tooltipDismissed && greetingPhase === "gone";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#08060f" }}>
      <WebGLErrorBoundary>
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.35} color="#ffe8cc" />
            <directionalLight position={[0, 12, 4]} intensity={0.5} color="#fff5e0" castShadow />
            <MarbleFloor />
            <DarkCeiling />
            <LobbyWalls />
            <LobbyColumns />
            <MagicScreen onClick={() => navigate("/theatre")} screenUrl={screenUrl} />
            {/* Nova's model loads separately so the lobby remains usable while assets load */}
            <Suspense fallback={null}>
              <Nova3D position={[2.6, 0, -3.2]} rotationY={-0.5} />
            </Suspense>
            <HallwayArch
              side="left"
              label="WING A"
              subLabel="6 Offices"
              onClick={() => navigate("/hallway/left")}
              highlighted={showTooltip && selectedWing === "A"}
            />
            <HallwayArch
              side="right"
              label="WING B"
              subLabel="5 Offices"
              onClick={() => navigate("/hallway/right")}
              highlighted={showTooltip && selectedWing === "B"}
            />
            <OrbitControls
              target={[0, 2.5, -2]}
              minDistance={4}
              maxDistance={18}
              minPolarAngle={0.1}
              maxPolarAngle={Math.PI / 2.08}
              enablePan={false}
              enableDamping
              dampingFactor={0.07}
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      {/* Top HUD */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: "none" }}>
        <div style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button onClick={() => navigate("/hallway/left")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Wing A</button>
            <button onClick={() => navigate("/hallway/right")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.1)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Wing B</button>
          </div>
          <div style={{ color: "#c8a050", fontSize: 13, letterSpacing: "2px", fontWeight: 600 }}>NEXT LEVEL HQ</div>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button onClick={() => navigate("/theatre")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#e8e4d8", cursor: "pointer", fontSize: 12 }}>🎭 Theatre</button>
            <a href={`${import.meta.env.BASE_URL}admin`} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#e8e4d8", fontSize: 12, textDecoration: "none" }}>⚙ Admin</a>
          </div>
        </div>
      </div>

      {/* Nova greeting */}
      <NovaGreeting
        phase={greetingPhase}
        onChoose={handleChoose}
        onDismiss={handleDismissGreeting}
      />

      {/* Wing tooltip */}
      {showTooltip && (
        <WingTooltip
          wing={selectedWing}
          onNavigate={(path) => navigate(path)}
          onDismiss={() => setTooltipDismissed(true)}
        />
      )}
    </div>
  );
}
