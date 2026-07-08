import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.2; const D = 13;

const TASKS = [
  { name: "Q3 Campaign Launch",     progress: 0.92, color: "#818cf8" },
  { name: "Team Onboarding x4",     progress: 0.75, color: "#4a9eff" },
  { name: "Content Calendar",       progress: 0.88, color: "#4ade80" },
  { name: "Automation Pipeline",    progress: 0.61, color: "#fb923c" },
  { name: "Monthly Reporting",      progress: 0.97, color: "#818cf8" },
  { name: "Resource Allocation",    progress: 0.45, color: "#f87171" },
  { name: "SOP Documentation",      progress: 0.83, color: "#4ade80" },
  { name: "System Health Audit",    progress: 0.70, color: "#fbbf24" },
];

function AnchorRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0a0e14" roughness={0.65} metalness={0.3} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => i - 7).map(n => (
        <mesh key={`gh${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[n, 0.001, 0]}>
          <planeGeometry args={[0.015, D]} />
          <meshStandardMaterial color="#818cf8" transparent opacity={0.12} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#06080e" roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c1020" roughness={0.85} />
      </mesh>
      {/* Floor strips */}
      {[-W / 2 + 0.02, W / 2 - 0.02].map((x, i) => (
        <mesh key={`st${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0]}>
          <planeGeometry args={[0.028, D]} />
          <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

function StatusBoard({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dotRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const t = useRef(0);
  const progressRef = useRef<number[]>(TASKS.map(t => t.progress));

  useFrame((_, delta) => {
    t.current += delta * 0.25;
    TASKS.forEach((task, i) => {
      // Progress gently increases then resets
      progressRef.current[i] = task.progress + Math.sin(t.current * 0.5 + i * 0.8) * 0.06;
      const p = Math.max(0.02, Math.min(1, progressRef.current[i]));
      if (barRefs.current[i]) {
        barRefs.current[i]!.scale.x = THREE.MathUtils.lerp(barRefs.current[i]!.scale.x, p, delta * 1.2);
        barRefs.current[i]!.position.x = -1.1 + barRefs.current[i]!.scale.x * 1.1;
      }
      if (dotRefs.current[i]) {
        dotRefs.current[i]!.emissiveIntensity = 0.5 + Math.sin(t.current * 3 + i) * 0.4;
      }
    });
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Board */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[3.2, 3.6]} />
        <meshStandardMaterial color="#060810" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[3.25, 3.65, 0.04]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={0.18} transparent opacity={0.5} />
      </mesh>
      <Text position={[0, 1.66, 0.01]} fontSize={0.16} color="#818cf8" anchorX="center" letterSpacing={0.12}>MISSION CONTROL</Text>
      <mesh position={[0, 1.5, 0.008]}>
        <planeGeometry args={[3.0, 0.014]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={1} />
      </mesh>
      {TASKS.map((task, i) => (
        <group key={i} position={[0, 1.15 - i * 0.38, 0.01]}>
          {/* Status dot */}
          <mesh position={[-1.44, 0, 0]}>
            <circleGeometry args={[0.075, 14]} />
            <meshStandardMaterial ref={el => { dotRefs.current[i] = el; }} color={task.color} emissive={task.color} emissiveIntensity={0.6} />
          </mesh>
          <Text position={[-1.28, 0, 0]} fontSize={0.09} color="#c8cce8" anchorX="left">{task.name}</Text>
          {/* Track */}
          <mesh position={[0.5, -0.16, 0]}>
            <planeGeometry args={[2.2, 0.07]} />
            <meshStandardMaterial color="#0c1028" />
          </mesh>
          {/* Fill */}
          <mesh ref={el => { barRefs.current[i] = el; }} position={[-0.6, -0.16, 0.005]}>
            <planeGeometry args={[2.2, 0.065]} />
            <meshStandardMaterial color={task.color} emissive={task.color} emissiveIntensity={0.7} />
          </mesh>
          <Text position={[1.46, -0.16, 0.01]} fontSize={0.08} color={task.color} anchorX="right">
            {Math.round(progressRef.current[i] * 100)}%
          </Text>
        </group>
      ))}
    </group>
  );
}

function OpsDesk() {
  return (
    <group position={[0, 0, 1]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[3.5, 0.07, 1.2]} />
        <meshStandardMaterial color="#0c1018" roughness={0.3} metalness={0.7} />
      </mesh>
      {[[-1.65, -0.55], [-1.65, 0.55], [1.65, -0.55], [1.65, 0.55]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <boxGeometry args={[0.06, 0.78, 0.06]} />
          <meshStandardMaterial color="#080c10" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Dual monitors */}
      {[-0.75, 0.75].map((x, i) => (
        <group key={i} position={[x, 0.86, -0.4]}>
          <mesh>
            <boxGeometry args={[1.1, 0.7, 0.04]} />
            <meshStandardMaterial color="#0a0e14" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[1.02, 0.62]} />
            <meshStandardMaterial color="#040810" emissive="#818cf8" emissiveIntensity={0.35 + i * 0.15} />
          </mesh>
        </group>
      ))}
      {/* Chair */}
      <group position={[0, 0, 0.8]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.72, 0.07, 0.65]} />
          <meshStandardMaterial color="#0c1018" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.82, -0.3]}>
          <boxGeometry args={[0.72, 0.75, 0.07]} />
          <meshStandardMaterial color="#0c1018" metalness={0.5} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function TimelineBand() {
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const items = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"][i],
    fill: 0.3 + i * 0.1,
    color: ["#818cf8", "#4a9eff", "#4ade80", "#fbbf24", "#818cf8", "#f87171", "#4ade80"][i],
  })), []);

  useFrame((_, delta) => {
    t.current += delta;
    barRefs.current.forEach((bar, i) => {
      if (bar) {
        const target = items[i].fill + Math.sin(t.current * 0.4 + i * 0.5) * 0.06;
        bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, Math.max(0.05, target), delta * 1.0);
        bar.position.y = bar.scale.y / 2 * 1.2 - 0.5;
      }
    });
  });

  return (
    <group position={[W / 2 - 0.1, 1.8, -2]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[2.8, 2.2]} />
        <meshStandardMaterial color="#040810" transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 0.95, 0.01]} fontSize={0.13} color="#818cf8" anchorX="center">TIMELINE</Text>
      {items.map((item, i) => (
        <group key={i} position={[-1.1 + i * 0.37, 0, 0.01]}>
          <mesh ref={el => { barRefs.current[i] = el; }} position={[0, 0, 0]}>
            <boxGeometry args={[0.28, 1.2, 0.02]} />
            <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.6} />
          </mesh>
          <Text position={[0, -0.72, 0]} fontSize={0.09} color="#6668a0" anchorX="center">{item.label}</Text>
        </group>
      ))}
    </group>
  );
}

export default function AnchorOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#030408" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#1020a0" />
          <pointLight position={[0, H - 0.4, 0]} intensity={10} distance={14} color="#818cf8" />
          <AnchorRoom />
          <StatusBoard position={[0, 2.0, -D / 2 + 0.12]} rotation={[0, 0, 0]} />
          <OpsDesk />
          <TimelineBand />
          <Text position={[0, H - 0.3, -D / 2 + 0.08]} fontSize={0.3} color="#818cf8" anchorX="center" letterSpacing={0.2}>ANCHOR</Text>
          <Text position={[0, H - 0.68, -D / 2 + 0.08]} fontSize={0.12} color="#4a4a88" anchorX="center">Mission Control · Simple. Dependable. Always organized.</Text>
          <OrbitControls target={[0, 1.8, -0.5]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/right")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(129,140,248,0.4)", background: "rgba(129,140,248,0.1)", color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing B</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#818cf8", fontSize: 12, letterSpacing: "2px" }}>ANCHOR · Mission Control</div>
      </div>
    </div>
  );
}
