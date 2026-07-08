import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import { OFFICES } from "../data/offices";

const RW = 22;
const RH = 9;
const RD = 18;

function TheatreRoom() {
  return (
    <group>
      {/* Floor — dark carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#0e0c14" roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, RH, 0]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color="#060408" roughness={1} />
      </mesh>
      {/* Side walls */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-RW / 2, RH / 2, 0]}>
        <planeGeometry args={[RD, RH]} />
        <meshStandardMaterial color="#0a080e" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[RW / 2, RH / 2, 0]}>
        <planeGeometry args={[RD, RH]} />
        <meshStandardMaterial color="#0a080e" roughness={0.95} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, RH / 2, RD / 2]}>
        <planeGeometry args={[RW, RH]} />
        <meshStandardMaterial color="#0a080e" roughness={0.95} />
      </mesh>
      {/* Front wall with screen cutout area */}
      <mesh position={[0, RH / 2, -RD / 2]}>
        <planeGeometry args={[RW, RH]} />
        <meshStandardMaterial color="#08060a" roughness={1} />
      </mesh>
    </group>
  );
}

function TheatreScreen() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  const textRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    t.current += delta * 0.03;
    if (matRef.current) {
      matRef.current.color.setHSL(t.current % 1, 0.6, 0.08);
      matRef.current.emissive.setHSL((t.current + 0.1) % 1, 0.8, 0.18);
    }
    if (lightRef.current) {
      lightRef.current.color.setHSL(t.current % 1, 0.9, 0.5);
      lightRef.current.intensity = 14 + Math.sin(t.current * 40) * 5;
    }
  });

  return (
    <group position={[0, 4.5, -RD / 2 + 0.3]}>
      {/* Screen border */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[20.4, 7.4, 0.12]} />
        <meshStandardMaterial color="#c8a050" emissive="#c8a050" emissiveIntensity={0.25} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[20, 7, 0.1]} />
        <meshStandardMaterial color="#03020a" roughness={0.9} />
      </mesh>
      {/* Screen */}
      <mesh>
        <planeGeometry args={[19.2, 6.4]} />
        <meshStandardMaterial ref={matRef} roughness={0.05} />
      </mesh>
      {/* NEXT LEVEL title */}
      <Text position={[0, 1.6, 0.02]} fontSize={1.1} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.35} outlineWidth={0.03} outlineColor="#000">
        NEXT LEVEL
      </Text>
      <Text position={[0, 0.3, 0.02]} fontSize={0.4} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.2}>
        HEADQUARTERS
      </Text>
      {/* Agent roster */}
      <Text position={[-6, -1.0, 0.02]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="top" lineHeight={1.8} maxWidth={8}>
        {OFFICES.filter(o => o.hallway === "left" && !o.isBreakroom).map(o => o.name).join("  ·  ")}
      </Text>
      <Text position={[6, -1.0, 0.02]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="top" lineHeight={1.8} maxWidth={8}>
        {OFFICES.filter(o => o.hallway === "right" && !o.isBreakroom).map(o => o.name).join("  ·  ")}
      </Text>
      <pointLight ref={lightRef} position={[0, 0, 6]} intensity={14} distance={28} />
    </group>
  );
}

function TheatreSeats() {
  const rows = [
    { z: 3.5, y: 0.0, count: 10 },
    { z: 5.5, y: 0.2, count: 10 },
    { z: 7.5, y: 0.4, count: 10 },
  ];
  return (
    <>
      {rows.map(({ z, y, count }, ri) => (
        <group key={ri}>
          {Array.from({ length: count }, (_, i) => i - count / 2 + 0.5).map((xi, ci) => (
            <group key={ci} position={[xi * 1.85, y, z]}>
              {/* Seat base */}
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.7, 0.08, 0.6]} />
                <meshStandardMaterial color="#1a1228" roughness={0.8} />
              </mesh>
              {/* Backrest */}
              <mesh position={[0, 0.85, -0.24]} castShadow>
                <boxGeometry args={[0.7, 0.75, 0.08]} />
                <meshStandardMaterial color="#1a1228" roughness={0.8} />
              </mesh>
            </group>
          ))}
          {/* Row step riser */}
          <mesh position={[0, y / 2, z - 0.95]}>
            <boxGeometry args={[RW - 2, y + 0.01, 0.1]} />
            <meshStandardMaterial color="#100e1a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function StarField() {
  const geo = useRef<THREE.BufferGeometry>(null!);
  const stars = 250;
  const positions = new Float32Array(stars * 3);
  for (let i = 0; i < stars; i++) {
    positions[i * 3] = (Math.random() - 0.5) * RW;
    positions[i * 3 + 1] = Math.random() * RH;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RD;
  }

  useFrame((_, delta) => {
    if (geo.current) {
      const pos = geo.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < stars; i++) {
        pos.array[i * 3 + 1] -= delta * 0.3;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = RH;
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={stars} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.06} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function TheatrePage() {
  const [, navigate] = useLocation();

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#04030a" }}>
      <Canvas shadows camera={{ position: [0, 3.5, 8], fov: 62, near: 0.1, far: 150 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.15} color="#3020a0" />
          <TheatreRoom />
          <TheatreScreen />
          <TheatreSeats />
          <StarField />
          <OrbitControls target={[0, 3, -3]} minDistance={3} maxDistance={16} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.1} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20 }}>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.4)", background: "rgba(200,160,80,0.12)", color: "#c8a050", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ← Lobby
        </button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#c8a050", fontSize: 12, letterSpacing: "2px" }}>THEATRE</div>
      </div>
    </div>
  );
}
