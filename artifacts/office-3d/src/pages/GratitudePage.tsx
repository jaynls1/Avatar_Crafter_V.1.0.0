import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import { getSafeExternalUrl, GRATITUDE_ENTRIES, type GratitudeEntry } from "../data/hallway";
import WebGLErrorBoundary, { canUseWebGL, WebGLUnavailable } from "../components/WebGLErrorBoundary";

function GratitudePlaque({ entry, position, rotY }: { entry: GratitudeEntry; position: [number, number, number]; rotY: number }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * Math.PI);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.8 : 0.3) + Math.sin(t.current * 2) * 0.1;
    }
  });

  const handleClick = () => {
    const safeUrl = getSafeExternalUrl(entry.url);
    if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[2.25, 2.8, 0.16]} />
        <meshStandardMaterial
          ref={glowRef}
          color={entry.accentColor}
          emissive={entry.accentColor}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[2.05, 2.6]} />
        <meshStandardMaterial color="#080b12" roughness={0.72} metalness={0.18} />
      </mesh>

      <group position={[0, 0, 0.08]}>
        <mesh
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
          onClick={handleClick}
        >
          <planeGeometry args={[2.05, 2.6]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        <Html transform center distanceFactor={8} position={[0, 0, 0.02]} pointerEvents="none">
          <div
            style={{
              width: "220px",
              height: "260px",
              background: hovered ? "rgba(19, 24, 34, 0.96)" : "rgba(8, 12, 18, 0.9)",
              border: `1px solid ${hovered ? entry.accentColor : "rgba(255,255,255,0.12)"}`,
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "22px",
              color: "#fff",
              textAlign: "center",
              transition: "all 0.3s ease",
              boxShadow: hovered ? `0 0 28px ${entry.accentColor}55` : "0 12px 34px rgba(0,0,0,.28)",
              backdropFilter: "blur(8px)",
              transform: hovered ? "scale(1.035)" : "scale(1)",
            }}
          >
            <div style={{ width: "80px", height: "80px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={(import.meta.env.BASE_URL || "/") + entry.logo.replace(/^\//, "")} alt={entry.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: `brightness(0) invert(1)${hovered ? ` drop-shadow(0 0 8px ${entry.accentColor})` : ""}`, transition: "all 0.3s" }} />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: hovered ? entry.accentColor : "#fff", transition: "color 0.3s" }}>
              {entry.name}
            </h3>
            <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.4" }}>
              {entry.note}
            </p>
            <div style={{ marginTop: "14px", color: entry.accentColor, fontSize: "10px", letterSpacing: "1.6px", fontWeight: 700 }}>
              VISIT OFFICIAL PAGE
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

function GratitudeEnvironment() {
  const radius = 11;
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius + 1, 64]} />
        <meshStandardMaterial color="#040508" roughness={0.6} metalness={0.4} />
      </mesh>
      
      {/* Center Star / Logo footprint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#0a0c12" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Recognition gallery wall */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[radius, radius, 6.4, 64, 1, true]} />
        <meshStandardMaterial color="#080a10" roughness={0.9} metalness={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[radius, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#020305" roughness={1} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function GratitudePage() {
  const [, navigate] = useLocation();
  const webglSupported = canUseWebGL();

  // Mount recognition plaques around the room's inner wall.
  const radius = 10.55;
  const count = GRATITUDE_ENTRIES.length;
  const plaques = GRATITUDE_ENTRIES.map((entry, i) => {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    return { entry, position: [x, 2.75, z] as [number, number, number], rotY: Math.atan2(-x, -z) };
  });

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#020305" }}>
      {webglSupported ? <WebGLErrorBoundary>
        <Canvas shadows camera={{ position: [0, 2, 4], fov: 60, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#ffe8cc" />
          <pointLight position={[0, 8, 0]} intensity={20} distance={20} color="#fff5e0" castShadow />
          <pointLight position={[0, 1, 0]} intensity={10} distance={10} color="#c8a050" />
          
          <GratitudeEnvironment />
          
          {plaques.map((plaque) => (
            <GratitudePlaque key={plaque.entry.id} entry={plaque.entry} position={plaque.position} rotY={plaque.rotY} />
          ))}

          <OrbitControls
            target={[0, 2, 0]}
            minDistance={1}
            maxDistance={10}
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI / 2.05}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
        </Canvas>
      </WebGLErrorBoundary> : <WebGLUnavailable />}

      <div style={{ position: "fixed", top: 14, left: 20, right: 20, zIndex: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/agent-lobby/left")} className="btn">
          Wing A Lobby
        </button>
        <button onClick={() => navigate("/agent-lobby/right")} className="btn">
          Wing B Lobby
        </button>
        <button onClick={() => navigate("/")} className="btn">
          Main HQ
        </button>
      </div>
      <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 20, textAlign: "center", pointerEvents: "none" }}>
        <div style={{ color: "#c8a050", fontSize: 14, letterSpacing: "3px", fontWeight: 600 }}>
          THE GRATITUDE ROOM
        </div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 6, letterSpacing: "1px" }}>
          Honoring the giants whose shoulders we stand on
        </div>
      </div>
      <details className="glass" style={{ position: "fixed", right: 18, bottom: 18, zIndex: 21, width: "min(330px, calc(100vw - 36px))", padding: "10px 12px", color: "#e8e4d8" }}>
        <summary style={{ cursor: "pointer", color: "#c8a050", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>
          RECOGNITION LINKS
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginTop: 10, maxHeight: "42vh", overflowY: "auto" }}>
          {GRATITUDE_ENTRIES.map((entry) => {
            const safeUrl = getSafeExternalUrl(entry.url);
            return safeUrl ? (
              <a key={entry.id} href={safeUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ textDecoration: "none", textAlign: "center" }}>
                {entry.name}
              </a>
            ) : null;
          })}
        </div>
      </details>
    </div>
  );
}
