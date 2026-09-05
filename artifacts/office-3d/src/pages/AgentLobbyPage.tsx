import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation, useParams } from "wouter";
import * as THREE from "three";
import { getHallwayOffices, type Office } from "../data/offices";
import { getSafeExternalUrl } from "../data/hallway";
import WebGLErrorBoundary, { canUseWebGL, WebGLUnavailable } from "../components/WebGLErrorBoundary";
import { trackEvent } from "../lib/analytics";

function OfficeDoor({ office, position, rotY }: { office: Office; position: [number, number, number]; rotY: number }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * Math.PI);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.8 : 0.3) + Math.sin(t.current * 2) * 0.1;
    }
  });

  const doorW = 1.6;
  const doorH = 2.8;

  const handleClick = () => {
    if (office.isBreakroom && office.breakroomUrl) {
      const safeUrl = getSafeExternalUrl(office.breakroomUrl);
      if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
    } else {
      trackEvent("agent_office_opened", { source: "agent_lobby" });
      navigate(office.path);
    }
  };

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh position={[0, doorH / 2 + 0.15, 0]}>
        <boxGeometry args={[doorW + 0.4, 0.3, 0.2]} />
        <meshStandardMaterial ref={glowRef} color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-(doorW / 2 + 0.15), doorH / 2, 0]}>
        <boxGeometry args={[0.3, doorH, 0.2]} />
        <meshStandardMaterial color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[(doorW / 2 + 0.15), doorH / 2, 0]}>
        <boxGeometry args={[0.3, doorH, 0.2]} />
        <meshStandardMaterial color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Door void / panel */}
      <mesh
        position={[0, doorH / 2, 0.05]}
        onClick={handleClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[doorW, doorH]} />
        <meshStandardMaterial color={hovered ? "#161b22" : "#0d1117"} roughness={0.7} />
      </mesh>

      {/* Door panels detail */}
      <mesh position={[0, doorH * 0.7, 0.08]}>
        <boxGeometry args={[doorW * 0.75, doorH * 0.3, 0.02]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.9} />
      </mesh>
      <mesh position={[0, doorH * 0.3, 0.08]}>
        <boxGeometry args={[doorW * 0.75, doorH * 0.35, 0.02]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.9} />
      </mesh>

      {/* Knob */}
      <mesh position={[doorW * 0.35, doorH * 0.45, 0.12]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={office.accentColor} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Name plate */}
      <Text position={[0, doorH + 0.55, 0.1]} fontSize={0.22} color={office.accentColor} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000">
        {office.name}
      </Text>
      <Text position={[0, doorH + 0.2, 0.1]} fontSize={0.12} color="#aaa" anchorX="center" anchorY="middle">
        {hovered ? (office.isBreakroom ? "Open site" : "Enter office") : office.title}
      </Text>
    </group>
  );
}

function GratitudePortal({ position, rotY }: { position: [number, number, number]; rotY: number }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.8 : 0.3) + Math.sin(t.current * 1.5) * 0.15;
    }
  });

  const w = 2.4;
  const h = 3.2;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Arch */}
      <mesh position={[0, h / 2, 0]}>
        <torusGeometry args={[w / 2, 0.15, 16, 32, Math.PI]} />
        <meshStandardMaterial ref={glowRef} color="#c8a050" emissive="#c8a050" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-w / 2, h / 4, 0]}>
        <cylinderGeometry args={[0.15, 0.15, h / 2, 16]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[w / 2, h / 4, 0]}>
        <cylinderGeometry args={[0.15, 0.15, h / 2, 16]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Portal Void */}
      <mesh
        position={[0, h / 2 - 0.2, 0]}
        onClick={() => navigate("/gratitude")}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[w - 0.2, h]} />
        <meshStandardMaterial color={hovered ? "#161b22" : "#0d1117"} roughness={1} />
      </mesh>

      <Text position={[0, h + 0.4, 0]} fontSize={0.25} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.1}>
        THE GRATITUDE ROOM
      </Text>
      <Text position={[0, h / 2, 0.1]} fontSize={0.14} color={hovered ? "#fff" : "#888"} anchorX="center" anchorY="middle">
        {hovered ? "Enter" : "Acknowledge our foundations"}
      </Text>
    </group>
  );
}

function LobbyRoom({ wallColor }: { wallColor: string }) {
  const radius = 8;
  const height = 6;
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius + 2, 64]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Center detail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[radius * 0.4, 32]} />
        <meshStandardMaterial color="#11161d" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <circleGeometry args={[radius + 2, 64]} />
        <meshStandardMaterial color="#050608" roughness={1} />
      </mesh>
      {/* Wall */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function AgentLobbyPage() {
  const [, navigate] = useLocation();
  const { side } = useParams<{ side: string }>();
  const isLeft = side === "left";
  const webglSupported = canUseWebGL();
  const offices = getHallwayOffices(side || "left");

  const wallColor = isLeft ? "#121824" : "#181a24";
  const radius = 7.8;
  useEffect(() => {
    trackEvent("area_entered", { area: "agent_lobby", wing: isLeft ? "a" : "b" });
  }, [isLeft]);

  // We want to arrange the doors in an arc, leaving space behind the camera for the entrance
  // Angles from -PI/2 to PI/2 (front semicircle)
  const angleStep = Math.PI / (offices.length + 1);
  const doors = offices.map((office, i) => {
    // start from right to left or left to right
    const angle = -Math.PI / 2 + angleStep * (i + 1);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    // rotY should face the center. Normal of circle is atan2(x, z).
    const rotY = Math.atan2(-x, -z);
    return { office, position: [x, 0, z] as [number, number, number], rotY };
  });

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050608" }}>
      {webglSupported ? <WebGLErrorBoundary>
        <Canvas shadows camera={{ position: [0, 1.8, 4], fov: 60, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} color="#ffe8cc" />
          <pointLight position={[0, 4, 0]} intensity={15} distance={15} color="#fff5e0" castShadow />
          
          <LobbyRoom wallColor={wallColor} />
          
          {doors.map((door, i) => (
            <OfficeDoor key={i} office={door.office} position={door.position} rotY={door.rotY} />
          ))}

          {/* Gratitude portal at the very back (opposite to entrance) */}
          <GratitudePortal position={[0, 0, radius - 0.2]} rotY={Math.PI} />

          <OrbitControls
            target={[0, 2, -2]}
            minDistance={1}
            maxDistance={6}
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI / 2.1}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
        </Canvas>
      </WebGLErrorBoundary> : <WebGLUnavailable />}

      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate(`/hallway/${side}`)} className="btn">
          ← Back to Gallery
        </button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#c8a050", fontSize: 13, letterSpacing: "2px", fontWeight: 600 }}>
          {isLeft ? "WING A LOBBY" : "WING B LOBBY"}
        </div>
      </div>
      <details className="glass" style={{ position: "fixed", right: 18, bottom: 18, zIndex: 20, width: "min(320px, calc(100vw - 36px))", padding: "10px 12px", color: "#e8e4d8" }}>
        <summary style={{ cursor: "pointer", color: "#c8a050", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>
          CHOOSE A DESTINATION
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginTop: 10, maxHeight: "38vh", overflowY: "auto" }}>
          {offices.map((office) => {
            if (office.isBreakroom) {
              const safeUrl = getSafeExternalUrl(office.breakroomUrl);
              return safeUrl ? (
                <a key={office.id} href={safeUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: "none", textAlign: "center" }}>
                  {office.name}
                </a>
              ) : null;
            }
            return (
              <button key={office.id} onClick={() => navigate(office.path)} className="btn">
                {office.name}
              </button>
            );
          })}
          <button onClick={() => navigate("/gratitude")} className="btn" style={{ gridColumn: "1 / -1", color: "#c8a050" }}>
            The Gratitude Room
          </button>
        </div>
      </details>
    </div>
  );
}
