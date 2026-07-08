import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../store/useStore";

const POSE_KEYS = ["idle", "wave", "think", "point", "shrug", "walk"] as const;
const POSE_DURATIONS: Record<typeof POSE_KEYS[number], number> = {
  idle: 5, wave: 3.5, think: 4, point: 3, shrug: 3, walk: 3,
};

function useAvatarTextures() {
  const base = import.meta.env.BASE_URL;
  const paths = POSE_KEYS.map((k) => `${base}avatars/${k}.png`);
  const textures = useTexture(paths);
  return textures as THREE.Texture[];
}

interface PhotoAgentProps {
  position: [number, number, number];
}

const SPRITE_H = 1.95;
const SPRITE_W = SPRITE_H * (683 / 1024);

function AvatarSprite({ position }: PhotoAgentProps) {
  const { agentConfig, isSpeaking, currentMessage } = useStore();
  const textures = useAvatarTextures();
  const { camera } = useThree();

  const meshRef = useRef<THREE.Mesh>(null);
  const poseTimer = useRef(0);
  const poseIdx = useRef(0);
  const opacity = useRef(1);
  const fadingOut = useRef(false);
  const bobClock = useRef(0);

  const [currentTexture, setCurrentTexture] = useState<THREE.Texture>(textures[0]);

  useEffect(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
    });
    setCurrentTexture(textures[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    poseTimer.current += delta;
    bobClock.current += delta;

    const poseKey = POSE_KEYS[poseIdx.current];
    const poseDuration = POSE_DURATIONS[poseKey];

    if (!fadingOut.current && poseTimer.current >= poseDuration - 0.4) {
      fadingOut.current = true;
    }

    if (fadingOut.current) {
      opacity.current = Math.max(0, opacity.current - delta * 3.5);
    }

    if (fadingOut.current && opacity.current <= 0) {
      poseIdx.current = (poseIdx.current + 1) % POSE_KEYS.length;
      setCurrentTexture(textures[poseIdx.current]);
      poseTimer.current = 0;
      fadingOut.current = false;
      opacity.current = 0;
    }

    if (!fadingOut.current) {
      opacity.current = Math.min(1, opacity.current + delta * 4);
    }

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity.current;

      meshRef.current.position.y = SPRITE_H / 2 + Math.sin(bobClock.current * 1.1) * 0.018;

      const dir = new THREE.Vector3().subVectors(camera.position, meshRef.current.getWorldPosition(new THREE.Vector3()));
      dir.y = 0;
      dir.normalize();
      meshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} scale={[1, 0.45, 1]}>
        <circleGeometry args={[0.32, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} />
      </mesh>
      <mesh ref={meshRef} position={[0, SPRITE_H / 2, 0]}>
        <planeGeometry args={[SPRITE_W, SPRITE_H]} />
        <meshBasicMaterial
          map={currentTexture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0, SPRITE_H + 0.22, 0]}
        fontSize={0.13}
        color="#c8a050"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#000000"
      >
        {agentConfig.name}
      </Text>
      {isSpeaking && currentMessage && (
        <Text
          position={[0, SPRITE_H + 0.5, 0]}
          fontSize={0.095}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          textAlign="center"
          outlineWidth={0.005}
          outlineColor="#ffffff"
        >
          💬 {currentMessage.slice(0, 60)}{currentMessage.length > 60 ? "…" : ""}
        </Text>
      )}
    </group>
  );
}

export default function PhotoAgent({ position }: PhotoAgentProps) {
  return <AvatarSprite position={position} />;
}
