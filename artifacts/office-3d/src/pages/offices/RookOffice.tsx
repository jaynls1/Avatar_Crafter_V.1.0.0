import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 12; const H = 4; const D = 12;

const EVENT_POOL = [
  "AUTH  ✓  user:atlas logged in        ",
  "SCAN  ✓  network:HQ perimeter clear  ",
  "PERM  ✓  vault access granted        ",
  "ALERT ⚠  anomaly detected: sector 7  ",
  "AUDIT ✓  backup verified 04:00 UTC   ",
  "BLOCK ✓  threat neutralised          ",
  "SCAN  ✓  endpoints healthy           ",
  "AUTH  ✓  user:nova session active    ",
  "LOG   ✓  activity within parameters  ",
  "PERM  ⚠  escalation request pending  ",
];

function RookRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#080c10" roughness={0.6} metalness={0.4} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => i - 6).map(n => (
        <mesh key={`gc${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[n, 0.001, 0]}>
          <planeGeometry args={[0.018, D]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.18} transparent opacity={0.5} />
        </mesh>
      ))}
      {Array.from({ length: 13 }, (_, i) => i - 6).map(n => (
        <mesh key={`gr${n}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, n]}>
          <planeGeometry args={[W, 0.018]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.18} transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#04060a" roughness={0.9} />
      </mesh>
      {[[0, -D / 2], [Math.PI / 2, -W / 2], [-Math.PI / 2, W / 2]].map(([ry, x], i) => (
        <mesh key={i} rotation={[0, ry as number, 0]} position={[(i === 0 ? 0 : x as number), H / 2, i === 0 ? -D / 2 : 0]}>
          <planeGeometry args={[i === 0 ? W : D, H]} />
          <meshStandardMaterial color="#060a0e" roughness={0.88} />
        </mesh>
      ))}
      {/* Blue strip lights */}
      {[-W / 2 + 0.02, W / 2 - 0.02].map((x, i) => (
        <mesh key={`st${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, 0]}>
          <planeGeometry args={[0.03, D]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -D / 2 + 0.04]}>
        <planeGeometry args={[W, 0.03]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function SecurityEventLog({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const visibleLines = 10;
  const textRefs = useRef<(THREE.Mesh | null)[]>([]);
  const linesRef = useRef<string[]>(() => EVENT_POOL.slice(0, visibleLines) as unknown as string[]);
  const timer = useRef(0);

  if (!linesRef.current.length) {
    linesRef.current = EVENT_POOL.slice(0, visibleLines);
  }

  const [displayLines, setDisplayLines] = useState<string[]>(() => EVENT_POOL.slice(0, visibleLines));

  useFrame((_, delta) => {
    timer.current += delta;
    if (timer.current > 1.8) {
      timer.current = 0;
      setDisplayLines(prev => {
        const next = [...prev.slice(1), EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]];
        return next;
      });
    }
    textRefs.current.forEach((mesh, i) => {
      if (mesh) {
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, (visibleLines - 1 - i) * 0.22 - 0.95, delta * 3);
      }
    });
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Panel */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[3.2, 2.8]} />
        <meshStandardMaterial color="#020608" transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[3.25, 2.85, 0.04]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.2} transparent opacity={0.6} />
      </mesh>
      {/* Header */}
      <Text position={[0, 1.22, 0.01]} fontSize={0.15} color="#22d3ee" anchorX="center" letterSpacing={0.12}>
        SECURITY EVENT LOG
      </Text>
      <mesh position={[0, 1.04, 0.008]}>
        <planeGeometry args={[3.0, 0.015]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
      </mesh>
      {/* Event lines */}
      {displayLines.map((line, i) => {
        const isAlert = line.includes("⚠");
        return (
          <Text
            key={i}
            ref={(el: THREE.Mesh | null) => { textRefs.current[i] = el; }}
            position={[-1.45, (visibleLines - 1 - i) * 0.22 - 0.95, 0.01]}
            fontSize={0.095}
            color={isAlert ? "#ff9900" : "#22d3ee"}
            anchorX="left"
            anchorY="middle"
          >
            {line}
          </Text>
        );
      })}
    </group>
  );
}

function CommandDesk() {
  return (
    <group position={[0, 0, 0.5]}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.07, 1.2]} />
        <meshStandardMaterial color="#0c1018" roughness={0.3} metalness={0.8} />
      </mesh>
      {[[-1.5, -0.5], [-1.5, 0.5], [1.5, -0.5], [1.5, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <boxGeometry args={[0.06, 0.78, 0.06]} />
          <meshStandardMaterial color="#080c10" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      {/* Triple monitors */}
      {[-1.0, 0, 1.0].map((x, i) => (
        <group key={i} position={[x, 0.86, -0.35]}>
          <mesh>
            <boxGeometry args={[0.82, 0.56, 0.04]} />
            <meshStandardMaterial color="#0a0e14" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.76, 0.5]} />
            <meshStandardMaterial color="#020608" emissive="#22d3ee" emissiveIntensity={0.4 + i * 0.1} />
          </mesh>
        </group>
      ))}
      {/* Chair */}
      <group position={[0, 0, 0.75]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.7, 0.07, 0.65]} />
          <meshStandardMaterial color="#0c1018" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.82, -0.3]} castShadow>
          <boxGeometry args={[0.7, 0.75, 0.07]} />
          <meshStandardMaterial color="#0c1018" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.44, 8]} />
          <meshStandardMaterial color="#080a0c" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function AlertIndicators() {
  const items = useMemo(() => [
    { label: "PERIMETER", ok: true },
    { label: "ENDPOINTS", ok: true },
    { label: "VAULT", ok: true },
    { label: "COMMS", ok: false },
  ], []);
  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    lightRefs.current.forEach((light, i) => {
      if (!light) return;
      if (!items[i].ok) {
        light.intensity = 4 + Math.sin(t.current * 6 + i) * 3;
      }
    });
  });

  return (
    <group position={[-W / 2 + 0.08, 2.2, 2]} rotation={[0, Math.PI / 2, 0]}>
      {items.map((item, i) => (
        <group key={i} position={[0, -i * 0.38, 0]}>
          <mesh>
            <circleGeometry args={[0.12, 20]} />
            <meshStandardMaterial color={item.ok ? "#22d3ee" : "#ff4400"} emissive={item.ok ? "#22d3ee" : "#ff4400"} emissiveIntensity={item.ok ? 0.6 : 1} />
          </mesh>
          <pointLight ref={el => { lightRefs.current[i] = el; }} position={[0, 0, 0.2]} intensity={item.ok ? 1.5 : 4} distance={2} color={item.ok ? "#22d3ee" : "#ff4400"} />
          <Text position={[0.22, 0, 0.01]} fontSize={0.1} color={item.ok ? "#22d3ee" : "#ff4400"} anchorX="left">
            {item.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

export default function RookOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#02040a" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 5.5], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.15} color="#0a2040" />
          <pointLight position={[0, H - 0.5, 0]} intensity={8} distance={12} color="#22d3ee" />
          <RookRoom />
          <CommandDesk />
          <SecurityEventLog position={[0, 2.2, -D / 2 + 0.12]} rotation={[0, 0, 0]} />
          <SecurityEventLog position={[W / 2 - 0.12, 2.2, -1]} rotation={[0, -Math.PI / 2, 0]} />
          <AlertIndicators />
          <Text position={[0, H - 0.28, -D / 2 + 0.08]} fontSize={0.3} color="#22d3ee" anchorX="center" letterSpacing={0.2}>ROOK</Text>
          <Text position={[0, H - 0.65, -D / 2 + 0.08]} fontSize={0.12} color="#1a7a8a" anchorX="center">Security Command · Minimal. Everything has purpose.</Text>
          <OrbitControls target={[0, 1.8, -0.5]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/right")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(34,211,238,0.4)", background: "rgba(34,211,238,0.1)", color: "#22d3ee", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing B</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#22d3ee", fontSize: 12, letterSpacing: "2px" }}>ROOK · Security Command</div>
      </div>
    </div>
  );
}
