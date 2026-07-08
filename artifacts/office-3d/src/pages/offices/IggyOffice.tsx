import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.5; const D = 13;

const IDEA_TEXTS = [
  "What if...", "Why not?", "2x faster!", "Reframe →",
  "Human first", "Break it", "AI + ❤️", "Ship it!",
  "Zero friction", "10x value", "Open loop", "Eureka!",
];

const EQUATIONS = [
  "E = mc²", "F = ma", "Δ = b²-4ac", "∑f(x)dx",
  "P(A|B) = P(B|A)·P(A)/P(B)", "ω = 2πf", "∇·E = ρ/ε₀",
];

function IggyRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#1a1410" roughness={0.75} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0e0c08" roughness={0.9} />
      </mesh>
      {/* Industrial walls */}
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#e8e4e0" roughness={0.88} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#d8d4d0" roughness={0.88} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#d8d4d0" roughness={0.88} />
      </mesh>
    </group>
  );
}

function WhiteboardWall() {
  const ideaPositions = useMemo(() => IDEA_TEXTS.map((_, i) => ({
    x: -5 + (i % 4) * 3.3,
    y: 0.6 + Math.floor(i / 4) * 0.9,
    phase: i * 0.55,
    initialVisible: Math.random() > 0.3,
  })), []);

  const textAlphas = useRef<number[]>(ideaPositions.map(p => p.initialVisible ? 1 : 0));
  const textTargets = useRef<number[]>(ideaPositions.map(p => p.initialVisible ? 1 : 0));
  const timer = useRef(0);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame((_, delta) => {
    timer.current += delta;
    // Randomly flip visibility
    if (Math.random() < delta * 0.5) {
      const i = Math.floor(Math.random() * IDEA_TEXTS.length);
      textTargets.current[i] = textTargets.current[i] > 0.5 ? 0 : 1;
    }
    // Animate alphas
    textAlphas.current.forEach((alpha, i) => {
      textAlphas.current[i] = THREE.MathUtils.lerp(alpha, textTargets.current[i], delta * 1.2);
      if (matRefs.current[i]) {
        matRefs.current[i]!.opacity = textAlphas.current[i] * 0.85;
      }
    });
  });

  return (
    <group position={[0, 1.8, -D / 2 + 0.06]}>
      {/* Whiteboard surface */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[W - 1, 3.2]} />
        <meshStandardMaterial color="#f8f8f2" roughness={0.3} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[W - 0.8, 3.4, 0.04]} />
        <meshStandardMaterial color="#8b6914" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Idea bubbles */}
      {IDEA_TEXTS.map((text, i) => (
        <group key={i} position={[ideaPositions[i].x, ideaPositions[i].y - 1.6, 0.02]}>
          <mesh>
            <circleGeometry args={[0.42, 24]} />
            <meshStandardMaterial
              ref={el => { matRefs.current[i] = el; }}
              color="#fb923c"
              transparent
              opacity={textAlphas.current[i] * 0.85}
            />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.115} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7}>
            {text}
          </Text>
        </group>
      ))}
      {/* Equations in upper area */}
      {EQUATIONS.slice(0, 4).map((eq, i) => (
        <Text key={i} position={[-5 + i * 3.3, 1.2, 0.01]} fontSize={0.13} color="#2a2a2a" anchorX="center" anchorY="middle">
          {eq}
        </Text>
      ))}
    </group>
  );
}

function BeanBag({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function StandingTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.9]} />
        <meshStandardMaterial color="#d8d4d0" roughness={0.5} metalness={0.1} />
      </mesh>
      {[[-0.85, -0.4], [-0.85, 0.4], [0.85, -0.4], [0.85, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.52, z]}>
          <cylinderGeometry args={[0.025, 0.025, 1.04, 8]} />
          <meshStandardMaterial color="#999" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Items on table */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.35]} />
        <meshStandardMaterial color="#fb923c" roughness={0.6} />
      </mesh>
    </group>
  );
}

function IdeaBubbles() {
  const count = 30;
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const initPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * W;
      p[i * 3 + 1] = Math.random() * H;
      p[i * 3 + 2] = (Math.random() - 0.5) * D;
    }
    return p;
  }, []);

  useFrame((_, delta) => {
    if (!geoRef.current) return;
    const attr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.3;
      if (arr[i * 3 + 1] > H) {
        arr[i * 3] = (Math.random() - 0.5) * W;
        arr[i * 3 + 1] = 0;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[initPos, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#fb923c" size={0.07} transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

export default function IggyOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0e0a06" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 62, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} color="#fff0e0" />
          <pointLight position={[0, H - 0.4, 0]} intensity={18} distance={16} color="#fff5e0" castShadow />
          <IggyRoom />
          <WhiteboardWall />
          <BeanBag position={[-3, 0, 2]} color="#fb923c" />
          <BeanBag position={[1, 0, 3.5]} color="#4a9eff" />
          <BeanBag position={[3.5, 0, 1.5]} color="#e879f9" />
          <BeanBag position={[-1, 0, 3]} color="#4ade80" />
          <StandingTable position={[-3.5, 0, -1.5]} />
          <StandingTable position={[3.5, 0, -1.5]} />
          <IdeaBubbles />
          <Text position={[0, H - 0.3, -D / 2 + 0.08]} fontSize={0.3} color="#fb923c" anchorX="center" letterSpacing={0.2}>IGGY</Text>
          <Text position={[0, H - 0.68, -D / 2 + 0.08]} fontSize={0.12} color="#8a4a20" anchorX="center">Innovation Garage · This room makes people feel possibility.</Text>
          <OrbitControls target={[0, 1.8, 0]} minDistance={2} maxDistance={12} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/right")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(251,146,60,0.4)", background: "rgba(251,146,60,0.1)", color: "#fb923c", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing B</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#fb923c", fontSize: 12, letterSpacing: "2px" }}>IGGY · Innovation Garage</div>
      </div>
    </div>
  );
}
