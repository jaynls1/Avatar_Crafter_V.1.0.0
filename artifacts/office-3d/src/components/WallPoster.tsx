import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { SoftwareTool } from "../data/tools";
import { useStore } from "../store/useStore";

interface WallPosterProps {
  tool: SoftwareTool;
  position: [number, number, number];
  rotation?: [number, number, number];
}

export default function WallPoster({ tool, position, rotation = [0, 0, 0] }: WallPosterProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { speak } = useStore();

  useFrame(() => {
    if (meshRef.current) {
      const target = hovered ? 1.04 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  const handleClick = () => {
    speak(`Opening ${tool.name}. ${tool.description}.`);
    setTimeout(() => window.open(tool.url, "_blank"), 800);
  };

  const frameColor = hovered ? "#c8a050" : "#6b4f2a";
  const bgColor = tool.color;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.015]}>
        <boxGeometry args={[1.85, 1.35, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <planeGeometry args={[1.7, 1.2]} />
        <meshStandardMaterial
          color={bgColor}
          roughness={0.8}
          emissive={bgColor}
          emissiveIntensity={hovered ? 0.15 : 0.04}
        />
      </mesh>
      <Text
        position={[0, 0.12, 0.02]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
      >
        {tool.name}
      </Text>
      <Text
        position={[0, -0.12, 0.02]}
        fontSize={0.1}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
      >
        {tool.category}
      </Text>
      <Text
        position={[0, -0.3, 0.02]}
        fontSize={0.075}
        color="#999999"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
      >
        {tool.description}
      </Text>
      {hovered && (
        <Text
          position={[0, -0.48, 0.02]}
          fontSize={0.082}
          color="#ffdd88"
          anchorX="center"
          anchorY="middle"
        >
          Click to open →
        </Text>
      )}
    </group>
  );
}
