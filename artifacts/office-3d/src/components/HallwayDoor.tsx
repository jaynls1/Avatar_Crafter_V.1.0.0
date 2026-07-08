import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

interface HallwayDoorProps {
  position: [number, number, number];
  rotationY: number;
  to: string;
  label: string;
  accentColor?: string;
}

const DOOR_W = 1.6;
const DOOR_H = 2.6;
const FRAME_T = 0.08;

export default function HallwayDoor({
  position,
  rotationY,
  to,
  label,
  accentColor = "#c8a050",
}: HallwayDoorProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.PointLight>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const glowIntensity = useRef(0);
  const glowOpacity = useRef(0);

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    glowIntensity.current = THREE.MathUtils.lerp(glowIntensity.current, target, delta * 4);
    glowOpacity.current = THREE.MathUtils.lerp(glowOpacity.current, target, delta * 4);

    if (glowRef.current) {
      glowRef.current.intensity = glowIntensity.current * 2.8;
    }
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = glowOpacity.current * 0.5;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, DOOR_H + FRAME_T / 2, 0.02]} castShadow>
        <boxGeometry args={[DOOR_W + FRAME_T * 2, FRAME_T, 0.1]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[-(DOOR_W / 2 + FRAME_T / 2), DOOR_H / 2, 0.02]} castShadow>
        <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, 0.1]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[(DOOR_W / 2 + FRAME_T / 2), DOOR_H / 2, 0.02]} castShadow>
        <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, 0.1]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh
        ref={innerRef}
        position={[0, DOOR_H / 2, 0.01]}
        onClick={() => navigate(to)}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshStandardMaterial
          color={hovered ? "#1a2e1a" : "#111820"}
          emissive={new THREE.Color(accentColor)}
          emissiveIntensity={0}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, DOOR_H / 2, -0.3]}>
        <planeGeometry args={[DOOR_W - 0.02, DOOR_H - 0.02]} />
        <meshStandardMaterial color="#050810" roughness={1} />
      </mesh>
      <mesh position={[DOOR_W / 2 - 0.22, DOOR_H / 2 - 0.1, 0.1]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, DOOR_H * 0.55, 0.03]}>
        <boxGeometry args={[DOOR_W - 0.3, DOOR_H * 0.35, 0.02]} />
        <meshStandardMaterial color="#0d1520" roughness={0.95} />
      </mesh>
      <mesh position={[0, DOOR_H * 0.2, 0.03]}>
        <boxGeometry args={[DOOR_W - 0.3, DOOR_H * 0.25, 0.02]} />
        <meshStandardMaterial color="#0d1520" roughness={0.95} />
      </mesh>
      <mesh position={[0, DOOR_H - 0.04, 0.04]}>
        <boxGeometry args={[DOOR_W - 0.1, 0.04, 0.02]} />
        <meshStandardMaterial color={accentColor} metalness={0.8} roughness={0.2} />
      </mesh>
      <pointLight
        ref={glowRef}
        position={[0, DOOR_H / 2, 0.6]}
        color={accentColor}
        intensity={0}
        distance={3}
        decay={2}
      />
      <Text
        position={[0, DOOR_H + 0.45, 0.05]}
        fontSize={0.14}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.007}
        outlineColor="#000000"
      >
        {label}
      </Text>
      <Text
        position={[0, DOOR_H + 0.24, 0.05]}
        fontSize={0.09}
        color={hovered ? "#aaffaa" : "#555"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {hovered ? "Click to enter →" : "Next Level"}
      </Text>
    </group>
  );
}
