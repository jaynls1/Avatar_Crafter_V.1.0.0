import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.5; const D = 13;

function IndyRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#f8f4ee" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#f5f0ea" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#f5f0ea" roughness={0.85} />
      </mesh>
      {/* Large window (back wall) */}
      <mesh position={[0, 2.2, -D / 2 + 0.03]}>
        <planeGeometry args={[9, 3]} />
        <meshStandardMaterial color="#d0e8ff" emissive="#b8d8ff" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function ArtCanvas({ position, rotation, delay }: { position: [number, number, number]; rotation: [number, number, number]; delay: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(delay);
  const hue = useRef(Math.random());

  useFrame((_, delta) => {
    t.current += delta * 0.12;
    hue.current = (hue.current + delta * 0.04) % 1;
    if (matRef.current) {
      matRef.current.color.setHSL(hue.current, 0.6, 0.55);
      matRef.current.emissive.setHSL((hue.current + 0.15) % 1, 0.4, 0.12);
      matRef.current.emissiveIntensity = 0.25 + Math.sin(t.current * 2) * 0.15;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[1.35, 1.85, 0.06]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.6} />
      </mesh>
      {/* Canvas */}
      <mesh>
        <planeGeometry args={[1.22, 1.72]} />
        <meshStandardMaterial ref={matRef} roughness={0.8} />
      </mesh>
      {/* Abstract strokes overlay */}
      {[[-0.3, 0.4], [0.25, -0.2], [-0.1, -0.5], [0.35, 0.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.01]} rotation={[0, 0, i * 0.6]}>
          <planeGeometry args={[0.4 + i * 0.1, 0.06]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.3 + i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

function RotatingModel({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y = t.current * 0.5;
      groupRef.current.rotation.x = Math.sin(t.current * 0.3) * 0.2;
    }
  });
  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#86efac" emissive="#4ade80" emissiveIntensity={0.3} wireframe />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#86efac" emissive="#4ade80" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={4} distance={3} color="#4ade80" />
    </group>
  );
}

function SketchStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[1.8, 0.06, 1.0]} />
        <meshStandardMaterial color="#d8d0c8" roughness={0.5} />
      </mesh>
      {[[-0.8, -0.45], [-0.8, 0.45], [0.8, -0.45], [0.8, 0.45]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.76, 8]} />
          <meshStandardMaterial color="#86efac" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Sketchpad */}
      <mesh position={[0, 0.8, -0.1]}>
        <boxGeometry args={[1.2, 0.85, 0.02]} />
        <meshStandardMaterial color="#fffff8" roughness={0.9} />
      </mesh>
      {/* Color swatches */}
      {["#f87171", "#4a9eff", "#4ade80", "#fbbf24", "#e879f9"].map((c, i) => (
        <mesh key={i} position={[-0.75 + i * 0.38, 0.79, 0.38]}>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 10]} />
          <meshStandardMaterial color={c} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function IndyOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f0ece4" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.1} color="#fff8f0" />
          <directionalLight position={[3, 8, 4]} intensity={0.8} color="#ffffff" castShadow />
          <IndyRoom />
          <ArtCanvas position={[-3.5, 2.2, -W / 2 + 0.06]} rotation={[0, 0, 0]} delay={0} />
          <ArtCanvas position={[0, 2.2, -W / 2 + 0.06]} rotation={[0, 0, 0]} delay={2} />
          <ArtCanvas position={[3.5, 2.2, -W / 2 + 0.06]} rotation={[0, 0, 0]} delay={4} />
          <ArtCanvas position={[-W / 2 + 0.06, 2.2, -2]} rotation={[0, Math.PI / 2, 0]} delay={1} />
          <ArtCanvas position={[-W / 2 + 0.06, 2.2, 2]} rotation={[0, Math.PI / 2, 0]} delay={3} />
          <SketchStation position={[-2.5, 0, 1]} />
          <SketchStation position={[2.5, 0, 1]} />
          <RotatingModel position={[0, 1.8, -1]} />
          <Text position={[0, H - 0.3, -D / 2 + 0.08]} fontSize={0.3} color="#4ade80" anchorX="center" letterSpacing={0.2}>INDY</Text>
          <Text position={[0, H - 0.68, -D / 2 + 0.08]} fontSize={0.12} color="#2d7a3a" anchorX="center">Creative Studio · Art everywhere. Always creating.</Text>
          <OrbitControls target={[0, 1.8, -0.5]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/left")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.1)", color: "#4ade80", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing A</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#4ade80", fontSize: 12, letterSpacing: "2px" }}>INDY · Creative Studio</div>
      </div>
    </div>
  );
}
