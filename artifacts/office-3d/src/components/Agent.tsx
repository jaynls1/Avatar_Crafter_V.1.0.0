import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../store/useStore";

interface AgentProps {
  position: [number, number, number];
}

export default function Agent({ position }: AgentProps) {
  const { agentConfig, isSpeaking, currentMessage } = useStore();
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta;
    const t = clock.current;

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.2) * 0.015;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.7) * 0.12;
      if (isSpeaking) {
        headRef.current.rotation.x = Math.sin(t * 8) * 0.035;
      } else {
        headRef.current.rotation.x *= 0.92;
      }
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t * 1.2 + Math.PI) * 0.08;
      if (isSpeaking) {
        leftArmRef.current.rotation.z = -0.25 + Math.sin(t * 5) * 0.15;
      } else {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -0.1, 0.05);
      }
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = Math.sin(t * 1.2) * 0.08;
      if (isSpeaking) {
        rightArmRef.current.rotation.z = 0.25 + Math.sin(t * 5 + 0.5) * 0.15;
      } else {
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.1, 0.05);
      }
    }
  });

  const { skinColor, shirtColor, hairColor, name } = agentConfig;

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <mesh position={[-0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.55, 4, 8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      <mesh position={[0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.55, 4, 8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 0.1, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.28]} />
        <meshStandardMaterial color="#2c1810" roughness={0.8} />
      </mesh>
      <mesh position={[0.12, 0.1, 0.05]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.28]} />
        <meshStandardMaterial color="#2c1810" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.55, 4, 8]} />
        <meshStandardMaterial color={shirtColor} roughness={0.85} />
      </mesh>
      <group ref={leftArmRef} position={[-0.3, 1.3, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.42, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.5, 0]} castShadow>
          <sphereGeometry args={[0.085, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.3, 1.3, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.42, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.5, 0]} castShadow>
          <sphereGeometry args={[0.085, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[0, 1.48, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.1, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <group ref={headRef} position={[0, 1.72, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.14, -0.02]}>
          <sphereGeometry args={[0.225, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
        <mesh position={[-0.08, 0.04, 0.2]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.08, 0.04, 0.2]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.08, 0.04, 0.224]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#1a0a00" />
        </mesh>
        <mesh position={[0.08, 0.04, 0.224]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshStandardMaterial color="#1a0a00" />
        </mesh>
        <mesh position={[0, -0.06, 0.215]}>
          <torusGeometry args={[0.05, 0.012, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#8b3a2a" />
        </mesh>
      </group>
      <Text
        position={[0, 2.08, 0]}
        fontSize={0.12}
        color="#c8a050"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {name}
      </Text>
      {isSpeaking && currentMessage && (
        <group position={[0, 2.3, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.095}
            color="#1a1a1a"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.2}
            textAlign="center"
            outlineWidth={0.005}
            outlineColor="#ffffff"
          >
            💬 {currentMessage.slice(0, 60)}{currentMessage.length > 60 ? "..." : ""}
          </Text>
        </group>
      )}
    </group>
  );
}
