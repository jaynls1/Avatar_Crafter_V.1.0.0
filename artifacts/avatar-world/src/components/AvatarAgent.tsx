import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Circle, Ring, RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Agent } from "../agents";

// ─── Sprite map ────────────────────────────────────────────────────────────────
// Sprites live in public/agents/<id>/{idle,speak,active}.png
interface SpritePoses { idle: string; speak: string; active: string; }

function agentSprites(id: string): SpritePoses {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return {
    idle:   `${base}/agents/${id}/idle.png`,
    speak:  `${base}/agents/${id}/speak.png`,
    active: `${base}/agents/${id}/active.png`,
  };
}

const SPRITE_MAP: Record<string, SpritePoses> = {
  atlas:  agentSprites("atlas"),
  nova:   agentSprites("nova"),
  rook:   agentSprites("rook"),
  sniper: agentSprites("sniper"),
  meme:   agentSprites("meme"),
  anchor: agentSprites("anchor"),
  ignite: agentSprites("ignite"),
  haven:  agentSprites("haven"),
  index:  agentSprites("index"),
  scribe: agentSprites("scribe"),
  legion: agentSprites("legion"),
};

// ─── CharacterSprite ───────────────────────────────────────────────────────────
interface CharacterSpriteProps {
  poses: SpritePoses;
  isSelected: boolean;
  isSpeaking: boolean;
  hovered: boolean;
}

function CharacterSprite({ poses, isSelected, isSpeaking, hovered }: CharacterSpriteProps) {
  const [idleTex, speakTex, activeTex] = useTexture([poses.idle, poses.speak, poses.active]);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (isSpeaking) {
      mat.map = speakTex;
    } else if (isSelected || hovered) {
      mat.map = activeTex;
    } else {
      mat.map = idleTex;
    }
    mat.needsUpdate = true;
  });

  return (
    <Billboard>
      {/* Ground shadow oval */}
      <mesh position={[0, -1.48, -0.01]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.35, 1]}>
        <circleGeometry args={[0.6, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef} position={[0, 0.1, 0]}>
        <planeGeometry args={[2.6, 3.2]} />
        <meshBasicMaterial
          map={idleTex}
          transparent
          opacity={1.0}
          blending={THREE.NormalBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}

// ─── AvatarAgent ───────────────────────────────────────────────────────────────
interface AvatarAgentProps {
  agent: Agent;
  isSelected: boolean;
  isSpeaking: boolean;
  isSpecialtyHighlighted: boolean;
  isSpecialtyDimmed: boolean;
  onSelect: (agent: Agent) => void;
}

export function AvatarAgent({
  agent,
  isSelected,
  isSpeaking,
  isSpecialtyHighlighted,
  isSpecialtyDimmed,
  onSelect,
}: AvatarAgentProps) {
  const groupRef   = useRef<THREE.Group>(null);
  const bodyRef    = useRef<THREE.Mesh>(null);
  const headRef    = useRef<THREE.Mesh>(null);
  const glowRef    = useRef<THREE.Mesh>(null);
  const auraRef    = useRef<THREE.Mesh>(null);
  const specialtyRingRef          = useRef<THREE.Mesh>(null);
  const specialtyLabelRef         = useRef<{ fillOpacity: number } | null>(null);
  const specialtyLabelBillboardRef = useRef<THREE.Group>(null);
  const specialtyLabelOpacity     = useRef(0);
  const specialtyPillRef          = useRef<THREE.Mesh>(null);
  const [hovered, setHovered]     = useState(false);
  const timeOffset                = useRef(Math.random() * Math.PI * 2);
  const wasDimmedRef              = useRef(false);

  const poses = SPRITE_MAP[agent.id];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + timeOffset.current;

    // Gentle idle bob
    groupRef.current.position.y = agent.position[1] + Math.sin(t * 0.8) * 0.04;

    // Subtle sway for robots only
    if (!poses) groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.1;

    if (headRef.current) {
      headRef.current.position.y = 1.7 + Math.sin(t * 1.2) * 0.05;
      headRef.current.scale.y = isSpeaking ? 1 + Math.sin(t * 12) * 0.04 : 1;
    }
    if (bodyRef.current) {
      bodyRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.02;
      bodyRef.current.scale.z = 1 + Math.sin(t * 1.5) * 0.02;
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isSelected
        ? 0.35 + Math.sin(t * 3) * 0.15
        : isSpeaking
        ? 0.3  + Math.sin(t * 6) * 0.12
        : hovered
        ? 0.15 + Math.sin(t * 2) * 0.05
        : 0.05 + Math.sin(t)     * 0.03;
    }

    if (auraRef.current) {
      auraRef.current.rotation.z = t * (isSpeaking ? 1.5 : isSelected ? 0.8 : 0.3);
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isSpeaking
        ? 0.4 + Math.sin(t * 8) * 0.2
        : isSelected
        ? 0.2 + Math.sin(t * 2) * 0.08
        : 0;
    }

    if (specialtyRingRef.current) {
      const mat = specialtyRingRef.current.material as THREE.MeshBasicMaterial;
      const target = isSpecialtyHighlighted ? 0.55 + Math.sin(t * 3) * 0.25 : 0;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, target, 0.08);
      specialtyRingRef.current.rotation.z = t * 1.5;
      specialtyRingRef.current.scale.setScalar(
        1 + (isSpecialtyHighlighted ? Math.sin(t * 2) * 0.06 : 0)
      );
    }

    if (specialtyLabelRef.current) {
      const target = isSpecialtyHighlighted ? 1 : 0;
      specialtyLabelOpacity.current = THREE.MathUtils.lerp(
        specialtyLabelOpacity.current, target, 0.08
      );
      (specialtyLabelRef.current as any).fillOpacity = specialtyLabelOpacity.current;
    }
    if (specialtyPillRef.current) {
      const mat = specialtyPillRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = specialtyLabelOpacity.current * 0.6;
    }

    // Dim effect when specialty filter is active and this agent doesn't match
    if (isSpecialtyDimmed || wasDimmedRef.current) {
      let allSettled = true;
      groupRef.current.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          if (!m || typeof m.opacity === "undefined") return;
          const targetOpacity = isSpecialtyDimmed ? 0.22 : 1;
          m.transparent = isSpecialtyDimmed;
          const next = THREE.MathUtils.lerp(m.opacity ?? 1, targetOpacity, 0.06);
          m.opacity = next;
          if (Math.abs(next - targetOpacity) > 0.01) allSettled = false;
        });
      });
      wasDimmedRef.current = isSpecialtyDimmed || !allSettled;
    }
  });

  return (
    <group
      ref={groupRef}
      position={agent.position}
      onClick={() => onSelect(agent)}
      onPointerOver={() => { setHovered(true);  document.body.style.cursor = "pointer"; }}
      onPointerOut ={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* Ground glow disc */}
      <Circle ref={glowRef} args={[1.2, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <meshBasicMaterial color={agent.color} transparent opacity={0.05} side={THREE.DoubleSide} />
      </Circle>

      {/* Spinning aura ring (visible when selected or speaking) */}
      <Ring ref={auraRef} args={[1.1, 1.5, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.39, 0]}>
        <meshBasicMaterial color={agent.accentColor} transparent opacity={0} side={THREE.DoubleSide} />
      </Ring>

      {/* Specialty highlight ring */}
      <Ring ref={specialtyRingRef} args={[1.6, 2.2, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.38, 0]}>
        <meshBasicMaterial color={agent.accentColor} transparent opacity={0} side={THREE.DoubleSide} />
      </Ring>

      {/* Character: sprite OR geometric robot fallback */}
      {poses ? (
        <CharacterSprite
          poses={poses}
          isSelected={isSelected}
          isSpeaking={isSpeaking}
          hovered={hovered}
        />
      ) : (
        <>
          <mesh ref={bodyRef} position={[0, 0.2, 0]} castShadow>
            <capsuleGeometry args={[0.38, 1.2, 8, 16]} />
            <meshStandardMaterial color={agent.color} roughness={0.3} metalness={0.6}
              emissive={agent.color} emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0.1} />
          </mesh>
          <mesh position={[0, 0.3, 0.39]} castShadow>
            <boxGeometry args={[0.5, 0.6, 0.02]} />
            <meshStandardMaterial color={agent.accentColor} roughness={0.2} metalness={0.8} emissive={agent.accentColor} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[-0.45, 0.7, 0]} castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color={agent.color} roughness={0.3} metalness={0.5} emissive={agent.color} emissiveIntensity={0.1} />
          </mesh>
          <mesh position={[0.45, 0.7, 0]} castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color={agent.color} roughness={0.3} metalness={0.5} emissive={agent.color} emissiveIntensity={0.1} />
          </mesh>
          <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
            <meshStandardMaterial color={agent.color} roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0.6, 0.1, 0]} rotation={[0, 0, -0.2]} castShadow>
            <capsuleGeometry args={[0.12, 0.7, 6, 12]} />
            <meshStandardMaterial color={agent.color} roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.3, 16]} />
            <meshStandardMaterial color={agent.accentColor} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh ref={headRef} position={[0, 1.7, 0]} castShadow>
            <sphereGeometry args={[0.38, 32, 32]} />
            <meshStandardMaterial color={agent.accentColor} roughness={0.2} metalness={0.7}
              emissive={agent.accentColor} emissiveIntensity={isSelected ? 0.5 : 0.2} />
          </mesh>
          <mesh position={[0, 1.72, 0.28]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
            <meshStandardMaterial color="#0a0a1a" roughness={0.0} metalness={1.0}
              emissive={isSpeaking || isSelected ? agent.color : "#001122"}
              emissiveIntensity={isSpeaking ? 0.8 : isSelected ? 0.5 : 0.3} />
          </mesh>
          <mesh position={[-0.12, 1.76, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={agent.accentColor} emissive={agent.accentColor}
              emissiveIntensity={isSpeaking || isSelected ? 2.5 : 1} roughness={0} metalness={0} />
          </mesh>
          <mesh position={[0.12, 1.76, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={agent.accentColor} emissive={agent.accentColor}
              emissiveIntensity={isSpeaking || isSelected ? 2.5 : 1} roughness={0} metalness={0} />
          </mesh>
        </>
      )}

      {/* Dynamic light when chatting */}
      {(isSelected || isSpeaking) && (
        <pointLight color={agent.color} intensity={2} distance={5} position={[0, 2, 0]} />
      )}

      {/* Specialty badge — fades in when filter active */}
      <Billboard ref={specialtyLabelBillboardRef} position={[0, poses ? 2.85 : 3.1, 0]}>
        <RoundedBox
          ref={specialtyPillRef}
          args={[Math.max(0.5, (`◉ ${agent.specialty}`).length * 0.086 + 0.22), 0.3, 0.01]}
          radius={0.12}
          smoothness={4}
          position={[0, 0, -0.01]}
        >
          <meshBasicMaterial color={agent.accentColor} transparent opacity={0} depthWrite={false} />
        </RoundedBox>
        <Text
          ref={specialtyLabelRef}
          fontSize={0.17}
          color={agent.accentColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor="black"
          fillOpacity={0}
        >
          {`◉ ${agent.specialty}`}
        </Text>
      </Billboard>

      {/* Name label — title appears on hover / select */}
      <Billboard position={[0, poses ? 2.2 : 2.5, 0]}>
        <Text
          fontSize={0.22}
          color={isSelected || hovered ? agent.accentColor : "white"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="black"
        >
          {agent.name}
        </Text>
        {(hovered || isSelected) && (
          <Text
            position={[0, -0.34, 0]}
            fontSize={0.13}
            color={agent.accentColor}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
          >
            {agent.title}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
