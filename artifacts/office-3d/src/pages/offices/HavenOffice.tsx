import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.2; const D = 13;

function HavenRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2e2018" roughness={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#d8d0c4" roughness={0.9} />
      </mesh>
      {[[-D / 2, [0, 0]], [0, [Math.PI / 2, -(W / 2)]], [0, [-Math.PI / 2, W / 2]]].map(([z, [ry, x]], i) => (
        <mesh key={i} rotation={[0, ry as number, 0]} position={[(x as number) || 0, H / 2, (z as number) || 0]}>
          <planeGeometry args={[i === 0 ? W : D, H]} />
          <meshStandardMaterial color={i === 0 ? "#e8e0d4" : "#ddd5c8"} roughness={0.88} />
        </mesh>
      ))}
      {/* Wainscoting */}
      {([0, Math.PI / 2, -Math.PI / 2] as number[]).map((ry, i) => {
        const px = i === 1 ? -W / 2 + 0.02 : i === 2 ? W / 2 - 0.02 : 0;
        const pz = i === 0 ? -D / 2 + 0.02 : 0;
        const gw = i === 0 ? W : D;
        return (
          <mesh key={`w${i}`} rotation={[0, ry, 0]} position={[px, 0.6, pz]}>
            <planeGeometry args={[gw, 1.2]} />
            <meshStandardMaterial color="#c8b89e" roughness={0.85} />
          </mesh>
        );
      })}
      {/* Wood floor boards */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`fb${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -4 + i * 1]}>
          <planeGeometry args={[W, 0.03]} />
          <meshStandardMaterial color="#1e1408" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Fireplace() {
  const lightRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (lightRef.current) {
      lightRef.current.intensity = 18 + Math.sin(t.current * 7.2) * 5 + Math.sin(t.current * 13.1) * 3;
      lightRef.current.color.setHSL(0.06 + Math.sin(t.current * 4) * 0.02, 1, 0.5);
    }
  });

  return (
    <group position={[0, 0, -D / 2 + 0.3]}>
      {/* Mantle surround */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.2, 3.0, 0.45]} />
        <meshStandardMaterial color="#3d2e1e" roughness={0.75} />
      </mesh>
      {/* Firebox opening */}
      <mesh position={[0, 0.75, 0.24]}>
        <boxGeometry args={[2.0, 1.5, 0.04]} />
        <meshStandardMaterial color="#0d0a06" roughness={0.95} />
      </mesh>
      {/* Brick interior */}
      <mesh position={[0, 0.75, 0.1]}>
        <boxGeometry args={[1.88, 1.38, 0.06]} />
        <meshStandardMaterial color="#2a1a0c" roughness={0.9} />
      </mesh>
      {/* Mantle shelf */}
      <mesh position={[0, 3.1, 0.32]}>
        <boxGeometry args={[3.6, 0.12, 0.65]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Log glow */}
      <mesh position={[0, 0.4, 0.2]}>
        <boxGeometry args={[1.4, 0.18, 0.35]} />
        <meshStandardMaterial color="#1a0a04" roughness={0.9} emissive="#c83800" emissiveIntensity={0.7} />
      </mesh>
      <FireParticles position={[0, 0.55, 0.2]} />
      <pointLight ref={lightRef} position={[0, 1.2, 1.8]} intensity={18} distance={12} color="#ff8822" />
    </group>
  );
}

function FireParticles({ position }: { position: [number, number, number] }) {
  const count = 90;
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const agesRef = useRef<Float32Array>(null!);
  if (!agesRef.current) agesRef.current = new Float32Array(count).map(() => Math.random());

  const initPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 0.8;
      p[i * 3 + 1] = Math.random() * 0.9;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return p;
  }, []);

  useFrame((_, delta) => {
    if (!geoRef.current) return;
    const attr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      agesRef.current[i] += delta * (0.55 + Math.random() * 0.45);
      if (agesRef.current[i] > 1) {
        agesRef.current[i] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 0.8;
        arr[i * 3 + 1] = 0.05;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
      } else {
        arr[i * 3] += (Math.random() - 0.5) * 0.012;
        arr[i * 3 + 1] += delta * (0.75 + Math.random() * 0.5);
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points position={position}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[initPos, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#ff6600" size={0.055} transparent opacity={0.88} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function EmberParticles({ position }: { position: [number, number, number] }) {
  const count = 40;
  const geoRef = useRef<THREE.BufferGeometry>(null!);
  const agesRef = useRef<Float32Array>(null!);
  if (!agesRef.current) agesRef.current = new Float32Array(count).map(() => Math.random());
  const initPos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 0.5;
      p[i * 3 + 1] = Math.random() * 1.8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    return p;
  }, []);

  useFrame((_, delta) => {
    if (!geoRef.current) return;
    const attr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      agesRef.current[i] += delta * (0.3 + Math.random() * 0.3);
      if (agesRef.current[i] > 1) {
        agesRef.current[i] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 0.5;
        arr[i * 3 + 1] = 0.1;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      } else {
        arr[i * 3] += (Math.random() - 0.5) * 0.008;
        arr[i * 3 + 1] += delta * 0.9;
        arr[i * 3 + 2] += (Math.random() - 0.5) * 0.005;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points position={position}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[initPos, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#ff9900" size={0.028} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Couches() {
  return (
    <group>
      {/* Left couch */}
      <group position={[-3.5, 0, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.5, 0.65, 1.1]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.85, -0.5]} castShadow>
          <boxGeometry args={[2.5, 0.9, 0.22]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.85} />
        </mesh>
        {/* Pillows */}
        <mesh position={[-0.65, 0.76, -0.12]} castShadow>
          <boxGeometry args={[0.65, 0.22, 0.65]} />
          <meshStandardMaterial color="#c8a050" roughness={0.9} />
        </mesh>
        <mesh position={[0.65, 0.76, -0.12]} castShadow>
          <boxGeometry args={[0.65, 0.22, 0.65]} />
          <meshStandardMaterial color="#8b4a2c" roughness={0.9} />
        </mesh>
      </group>
      {/* Right couch */}
      <group position={[3.5, 0, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.5, 0.65, 1.1]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.85, -0.5]} castShadow>
          <boxGeometry args={[2.5, 0.9, 0.22]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.85} />
        </mesh>
        <mesh position={[-0.65, 0.76, -0.12]}>
          <boxGeometry args={[0.65, 0.22, 0.65]} />
          <meshStandardMaterial color="#c8a050" roughness={0.9} />
        </mesh>
      </group>
      {/* Coffee table */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[1.4, 0.07, 0.9]} />
          <meshStandardMaterial color="#3d2510" roughness={0.6} metalness={0.05} />
        </mesh>
        {[[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.19, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
            <meshStandardMaterial color="#8b6914" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        {/* Tea set on table */}
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.18, 12]} />
          <meshStandardMaterial color="#c8a050" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function ReadingNook() {
  const lampRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (lampRef.current) lampRef.current.intensity = 8 + Math.sin(t.current * 2.1) * 1.2;
  });
  return (
    <group position={[4.8, 0, -4]}>
      {/* Chair */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.85, 0.7, 0.85]} />
        <meshStandardMaterial color="#6b3a1f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.0, -0.38]} castShadow>
        <boxGeometry args={[0.85, 0.85, 0.12]} />
        <meshStandardMaterial color="#6b3a1f" roughness={0.85} />
      </mesh>
      {/* Floor lamp */}
      <group position={[0.65, 0, 0]}>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
          <meshStandardMaterial color="#8b6914" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <coneGeometry args={[0.35, 0.4, 16, 1, true]} />
          <meshStandardMaterial color="#e8d8b0" emissive="#fff5cc" emissiveIntensity={0.8} side={2} transparent opacity={0.9} />
        </mesh>
        <pointLight ref={lampRef} position={[0, 1.3, 0]} intensity={8} distance={6} color="#ffc877" />
      </group>
    </group>
  );
}

function IndoorPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.5, 12]} />
        <meshStandardMaterial color="#6b3a1f" roughness={0.8} />
      </mesh>
      {[[-0.05, 0, 0.07], [0, 0, -0.06], [0.06, 0, 0]].map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.7 + i * 0.12, z]} rotation={[0, i * 0.7, i * 0.2 - 0.1]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.65, 6]} />
          <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
        </mesh>
      ))}
      {[[0, 1.2, 0], [0.2, 1.0, 0], [-0.2, 1.05, 0], [0.1, 1.3, 0]].map(([x, y, z], i) => (
        <mesh key={`l${i}`} position={[x, y, z]} rotation={[-0.3, i * 0.8, 0]}>
          <planeGeometry args={[0.38, 0.14]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#2d7a1e" : "#3d9c2a"} roughness={0.85} side={2} />
        </mesh>
      ))}
    </group>
  );
}

export default function HavenOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a1008" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} color="#ffcc88" />
          <HavenRoom />
          <Fireplace />
          <EmberParticles position={[0, 0.55, -D / 2 + 1.4]} />
          <Couches />
          <ReadingNook />
          <IndoorPlant position={[-5.5, 0, -4.5]} />
          <IndoorPlant position={[5.5, 0, -4.5]} />
          <Text position={[0, 3.5, -D / 2 + 0.1]} fontSize={0.32} color="#c8a050" anchorX="center" letterSpacing={0.2}>HAVEN</Text>
          <Text position={[0, 3.05, -D / 2 + 0.1]} fontSize={0.14} color="#999" anchorX="center">Sanctuary · Everyone deserves a safe space</Text>
          <OrbitControls target={[0, 1.5, -1]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/right")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(249,168,212,0.4)", background: "rgba(249,168,212,0.1)", color: "#f9a8d4", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing B</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#f9a8d4", fontSize: 12, letterSpacing: "2px" }}>HAVEN · Sanctuary</div>
      </div>
    </div>
  );
}
