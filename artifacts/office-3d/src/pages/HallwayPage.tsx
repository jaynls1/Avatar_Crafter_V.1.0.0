import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation, useParams } from "wouter";
import * as THREE from "three";
import { getHallwayOffices, type Office } from "../data/offices";

const HW = 5.5;
const HH = 4.2;
const HD = 32;

function HallwayRoom({ wallColor }: { wallColor: string }) {
  return (
    <group>
      {/* Carpet runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[HW, HD]} />
        <meshStandardMaterial color="#0e0c14" roughness={0.9} />
      </mesh>
      {/* Carpet strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[2, HD]} />
        <meshStandardMaterial color="#1a1428" roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HH, 0]}>
        <planeGeometry args={[HW, HD]} />
        <meshStandardMaterial color="#080610" roughness={1} />
      </mesh>
      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-HW / 2, HH / 2, 0]}>
        <planeGeometry args={[HD, HH]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[HW / 2, HH / 2, 0]}>
        <planeGeometry args={[HD, HH]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Far end wall with logo */}
      <mesh position={[0, HH / 2, -HD / 2]}>
        <planeGeometry args={[HW, HH]} />
        <meshStandardMaterial color="#0a0814" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CeilingLights() {
  const zPositions = Array.from({ length: 6 }, (_, i) => -HD / 2 + 3 + i * 5);
  return (
    <>
      {zPositions.map((z, i) => (
        <group key={i} position={[0, HH - 0.05, z]}>
          <mesh>
            <boxGeometry args={[1.2, 0.06, 0.3]} />
            <meshStandardMaterial color="#ffe8cc" emissive="#ffe8cc" emissiveIntensity={1.8} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={12} distance={8} color="#fff5e0" />
        </group>
      ))}
    </>
  );
}

function WallSconce({ position }: { position: [number, number, number] }) {
  const t = useRef(Math.random() * Math.PI * 2);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((_, delta) => {
    t.current += delta;
    if (lightRef.current) lightRef.current.intensity = 3 + Math.sin(t.current * 1.5) * 0.5;
  });
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.08, 0.22, 0.08]} />
        <meshStandardMaterial color="#8b6914" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.18, 0.1]}>
        <coneGeometry args={[0.12, 0.18, 12, 1, true]} />
        <meshStandardMaterial color="#fff3cc" emissive="#fff3cc" emissiveIntensity={1.5} side={2} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.1, 0.15]} intensity={3} distance={4} color="#ffc877" />
    </group>
  );
}

function OfficeDoor({ office, position, rotY, index }: { office: Office; position: [number, number, number]; rotY: number; index: number }) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(index * 1.2);

  useFrame((_, delta) => {
    t.current += delta;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = (hovered ? 0.7 : 0.2) + Math.sin(t.current * 2) * 0.08;
    }
  });

  const doorW = 1.4;
  const doorH = 2.5;

  const handleClick = () => {
    if (office.isBreakroom && office.breakroomUrl) {
      window.open(office.breakroomUrl, "_blank");
    } else {
      navigate(office.path);
    }
  };

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh position={[0, doorH / 2 + 0.12, 0]}>
        <boxGeometry args={[doorW + 0.32, 0.24, 0.16]} />
        <meshStandardMaterial ref={glowRef} color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.25} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[-(doorW / 2 + 0.14), doorH / 2, 0]}>
        <boxGeometry args={[0.24, doorH, 0.16]} />
        <meshStandardMaterial color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.2} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[(doorW / 2 + 0.14), doorH / 2, 0]}>
        <boxGeometry args={[0.24, doorH, 0.16]} />
        <meshStandardMaterial color={office.accentColor} emissive={office.accentColor} emissiveIntensity={0.2} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Door panel */}
      <mesh
        position={[0, doorH / 2, 0.05]}
        onClick={handleClick}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[doorW, doorH]} />
        <meshStandardMaterial color={hovered ? "#1a2420" : "#0d0a12"} roughness={0.9} />
      </mesh>
      {/* Door panels detail */}
      <mesh position={[0, doorH * 0.68, 0.08]}>
        <boxGeometry args={[doorW * 0.78, doorH * 0.28, 0.02]} />
        <meshStandardMaterial color="#0a0814" roughness={0.95} />
      </mesh>
      <mesh position={[0, doorH * 0.28, 0.08]}>
        <boxGeometry args={[doorW * 0.78, doorH * 0.35, 0.02]} />
        <meshStandardMaterial color="#0a0814" roughness={0.95} />
      </mesh>
      {/* Knob */}
      <mesh position={[doorW * 0.3, doorH * 0.45, 0.1]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color={office.accentColor} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Name plate */}
      <Text position={[0, doorH + 0.45, 0.08]} fontSize={0.2} color={office.accentColor} anchorX="center" anchorY="middle" outlineWidth={0.008} outlineColor="#000">
        {office.name}{office.isBreakroom ? " ☕" : ""}
      </Text>
      <Text position={[0, doorH + 0.16, 0.08]} fontSize={0.11} color="#888" anchorX="center" anchorY="middle">
        {hovered ? (office.isBreakroom ? "Open site →" : "Enter office →") : office.title}
      </Text>
    </group>
  );
}

function EndWall() {
  return (
    <group position={[0, HH / 2, -HD / 2 + 0.1]}>
      <Text position={[0, 0.4, 0]} fontSize={0.3} color="#c8a050" anchorX="center" anchorY="middle" letterSpacing={0.15}>
        NEXT LEVEL
      </Text>
      <Text position={[0, -0.1, 0]} fontSize={0.16} color="#444" anchorX="center" anchorY="middle" letterSpacing={0.1}>
        HEADQUARTERS
      </Text>
    </group>
  );
}

export default function HallwayPage() {
  const [, navigate] = useLocation();
  const { side } = useParams<{ side: string }>();
  const offices = getHallwayOffices(side || "left");
  const isLeft = side === "left";

  const wallColor = isLeft ? "#1a1428" : "#14181e";

  const doorPositions = offices.map((_, i) => {
    const isLeftDoor = i % 2 === 0;
    const row = Math.floor(i / 2);
    const z = -HD / 2 + 4 + row * 5;
    const x = isLeftDoor ? -(HW / 2 - 0.08) : (HW / 2 - 0.08);
    const rotY = isLeftDoor ? Math.PI / 2 : -Math.PI / 2;
    return { x, z, rotY };
  });

  const sconcePositions: [number, number, number][] = doorPositions.map(({ x, z }) => [
    x > 0 ? x - 0.2 : x + 0.2,
    2.6,
    z + 1.8,
  ]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#060410" }}>
      <Canvas shadows camera={{ position: [0, 2.2, HD / 2 - 1], fov: 65, near: 0.1, far: 120 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#2010a0" />
          <HallwayRoom wallColor={wallColor} />
          <CeilingLights />
          {sconcePositions.map((pos, i) => <WallSconce key={i} position={pos} />)}
          {offices.map((office, i) => (
            <OfficeDoor
              key={office.id}
              office={office}
              position={[doorPositions[i].x, 0, doorPositions[i].z]}
              rotY={doorPositions[i].rotY}
              index={i}
            />
          ))}
          <EndWall />
          <OrbitControls
            target={[0, 2, -5]}
            minDistance={2}
            maxDistance={16}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2.05}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.4)", background: "rgba(200,160,80,0.12)", color: "#c8a050", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ← Lobby
        </button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#c8a050", fontSize: 12, letterSpacing: "2px" }}>
          {isLeft ? "WING A" : "WING B"}
        </div>
      </div>
    </div>
  );
}
