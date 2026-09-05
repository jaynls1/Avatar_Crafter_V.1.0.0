import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Image as DreiImage, OrbitControls, Text } from "@react-three/drei";
import { useLocation, useParams } from "wouter";
import * as THREE from "three";
import { getSafeExternalUrl, MEMBER_SUCCESS_STORIES, type MemberSuccess } from "../data/hallway";
import WebGLErrorBoundary, { canUseWebGL, WebGLUnavailable } from "../components/WebGLErrorBoundary";
import { trackEvent } from "../lib/analytics";

const HW = 12.5;
const HH = 4.5;
const HD = 40;

function HallwayRoom({ wallColor }: { wallColor: string }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[HW, HD]} />
        <meshStandardMaterial color="#08090c" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Carpet runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[3, HD]} />
        <meshStandardMaterial color="#0f1218" roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HH, 0]}>
        <planeGeometry args={[HW, HD]} />
        <meshStandardMaterial color="#050608" roughness={1} />
      </mesh>
      {/* Walls */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-HW / 2, HH / 2, 0]}>
        <planeGeometry args={[HD, HH]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[HW / 2, HH / 2, 0]}>
        <planeGeometry args={[HD, HH]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

function CeilingLights() {
  const zPositions = Array.from({ length: 8 }, (_, i) => -HD / 2 + 2 + i * 5);
  return (
    <>
      {zPositions.map((z, i) => (
        <group key={i} position={[0, HH - 0.1, z]}>
          <mesh>
            <boxGeometry args={[1.5, 0.05, 0.4]} />
            <meshStandardMaterial color="#fff0d0" emissive="#fff0d0" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={15} distance={10} color="#fff5e0" />
        </group>
      ))}
    </>
  );
}

function GalleryFrame({ story, position, rotY }: { story: MemberSuccess; position: [number, number, number]; rotY: number }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * Math.PI);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.8 : 0.2) + Math.sin(t.current * 1.5) * 0.1;
    }
  });

  const fw = 2.2;
  const fh = 3.0;
  const safeStoryUrl = getSafeExternalUrl(story.url);
  const imageUrl = story.image
    ? `${import.meta.env.BASE_URL}${story.image.replace(/^\//, "")}`
    : null;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Inner canvas */}
      <mesh position={[0, fh / 2, 0.05]}>
        <planeGeometry args={[fw - 0.2, fh - 0.2]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.6} />
      </mesh>
      {imageUrl && (
        <DreiImage
          url={imageUrl}
          position={[0, fh / 2 + 0.25, 0.07]}
          scale={[fw - 0.35, fh - 0.85]}
          transparent
        />
      )}

      {/* Frame border */}
      <mesh position={[0, fh / 2, 0.02]}>
        <boxGeometry args={[fw, fh, 0.04]} />
        <meshStandardMaterial ref={glowRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.2} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Hover Glass */}
      <mesh
        position={[0, fh / 2, 0.08]}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = safeStoryUrl ? "pointer" : "default";
        }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
        onClick={() => safeStoryUrl && window.open(safeStoryUrl, "_blank", "noopener,noreferrer")}
      >
        <planeGeometry args={[fw - 0.2, fh - 0.2]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} />
      </mesh>

      {/* Text Content */}
      <Text position={[0, imageUrl ? 0.32 : fh / 2 + 0.3, 0.09]} fontSize={0.18} color="#c8a050" anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="#000" maxWidth={fw - 0.35} textAlign="center">
        {story.memberName.toUpperCase()}
      </Text>
      <Text position={[0, imageUrl ? 0.08 : fh / 2 - 0.2, 0.09]} fontSize={0.12} color="#aaa" anchorX="center" anchorY="middle" maxWidth={fw - 0.5} textAlign="center">
        {story.caption}
      </Text>
      <Text position={[0, 0.2, 0.09]} fontSize={0.09} color={story.url ? "#f3d58a" : "#686868"} anchorX="center" anchorY="middle">
        {safeStoryUrl ? "SELECT TO VIEW STORY" : "AWAITING APPROVED STORY"}
      </Text>

      {/* Spotlight */}
      <spotLight position={[0, fh + 1, 1]} target-position={[0, fh / 2, 0]} intensity={hovered ? 8 : 4} angle={0.4} penumbra={0.5} color="#fff5e0" />
      <object3D position={[0, fh / 2, 0]} />
    </group>
  );
}

function LobbyEntrance({ side, position }: { side: string; position: [number, number, number] }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.9 : 0.4) + Math.sin(t.current * 2) * 0.15;
    }
  });

  const w = 4;
  const h = 3.5;

  return (
    <group position={position}>
      {/* Grand Arch */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.2]} />
        <meshStandardMaterial ref={glowRef} color="#c8a050" emissive="#c8a050" emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh
        position={[0, h / 2 - 0.2, 0.11]}
        onClick={() => navigate(`/agent-lobby/${side}`)}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[w - 0.4, h - 0.4]} />
        <meshStandardMaterial color={hovered ? "#0d141f" : "#05070a"} roughness={0.9} />
      </mesh>

      <Text position={[0, h + 0.6, 0.1]} fontSize={0.3} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.1}>
        AGENT LOBBY
      </Text>
      <Text position={[0, h / 2, 0.12]} fontSize={0.16} color={hovered ? "#fff" : "#aaa"} anchorX="center" anchorY="middle">
        {hovered ? "Enter Lobby →" : "Proceed"}
      </Text>
    </group>
  );
}

export default function HallwayPage() {
  const [, navigate] = useLocation();
  const { side } = useParams<{ side: string }>();
  const isLeft = side === "left";
  const webglSupported = canUseWebGL();

  const stories = MEMBER_SUCCESS_STORIES.filter(s => s.wing === (isLeft ? "left" : "right"));
  const wallColor = isLeft ? "#12151c" : "#1a161b";
  useEffect(() => {
    trackEvent("area_entered", { area: "hallway", wing: isLeft ? "a" : "b" });
  }, [isLeft]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050608" }}>
      {webglSupported ? <WebGLErrorBoundary>
        <Canvas shadows camera={{ position: [0, 1.8, HD / 2 - 2], fov: 65, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} color="#ffe8cc" />

          <HallwayRoom wallColor={wallColor} />
          <CeilingLights />

          {stories.map((story, i) => {
            const isLeftWall = i % 2 === 0;
            const row = Math.floor(i / 2);
            // Space frames along the Z axis
            const z = HD / 2 - 8 - row * 7;
            const x = isLeftWall ? -(HW / 2 - 0.1) : (HW / 2 - 0.1);
            const rotY = isLeftWall ? Math.PI / 2 : -Math.PI / 2;

            return (
              <GalleryFrame key={story.id} story={story} position={[x, 0, z]} rotY={rotY} />
            );
          })}

          <LobbyEntrance side={side || "left"} position={[0, 0, -HD / 2 + 1]} />

          <OrbitControls
            target={[0, 2, -HD / 2]}
            minDistance={2}
            maxDistance={HD}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2.05}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
        </Canvas>
      </WebGLErrorBoundary> : <WebGLUnavailable />}

      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/")} className="btn">
          ← Back to Main HQ
        </button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#c8a050", fontSize: 13, letterSpacing: "2px", fontWeight: 600 }}>
          {isLeft ? "WING A GALLERY" : "WING B GALLERY"}
        </div>
      </div>
      <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <button onClick={() => navigate(`/agent-lobby/${side || "left"}`)} className="btn">
          Enter Agent Lobby
        </button>
        <details className="glass" style={{ width: "min(310px, calc(100vw - 36px))", padding: "10px 12px", color: "#e8e4d8" }}>
          <summary style={{ cursor: "pointer", color: "#c8a050", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>
            MEMBER STORY LINKS
          </summary>
          <div style={{ display: "grid", gap: 7, marginTop: 10, maxHeight: "34vh", overflowY: "auto" }}>
            {stories.map((story) => {
              const safeUrl = getSafeExternalUrl(story.url);
              return safeUrl ? (
                <a key={story.id} href={safeUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: "none" }}>
                  {story.memberName}
                </a>
              ) : (
                <span key={story.id} style={{ padding: "7px 9px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 7, color: "#858585", fontSize: 11 }}>
                  {story.memberName} — awaiting approved story
                </span>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}
