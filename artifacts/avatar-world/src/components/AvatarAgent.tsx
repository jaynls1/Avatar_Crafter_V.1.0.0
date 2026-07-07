import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Circle, Ring, RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Agent } from "../agents";

import anchorIdle   from "@assets/agents/anchor/idle.png";
import anchorSpeak  from "@assets/agents/anchor/speak.png";
import anchorActive from "@assets/agents/anchor/active.png";
import atlasIdle    from "@assets/agents/atlas/idle.png";
import atlasSpeak   from "@assets/agents/atlas/speak.png";
import atlasActive  from "@assets/agents/atlas/active.png";
import havenIdle    from "@assets/agents/haven/idle.png";
import havenSpeak   from "@assets/agents/haven/speak.png";
import havenActive  from "@assets/agents/haven/active.png";
import igniteIdle   from "@assets/agents/ignite/idle.png";
import igniteSpeak  from "@assets/agents/ignite/speak.png";
import igniteActive from "@assets/agents/ignite/active.png";
import indexIdle    from "@assets/agents/index/idle.png";
import indexSpeak   from "@assets/agents/index/speak.png";
import indexActive  from "@assets/agents/index/active.png";
import legionIdle   from "@assets/agents/legion/idle.png";
import legionSpeak  from "@assets/agents/legion/speak.png";
import legionActive from "@assets/agents/legion/active.png";
import memeIdle     from "@assets/agents/meme/idle.png";
import memeSpeak    from "@assets/agents/meme/speak.png";
import memeActive   from "@assets/agents/meme/active.png";
import novaIdle     from "@assets/agents/nova/idle.png";
import novaSpeak    from "@assets/agents/nova/speak.png";
import novaActive   from "@assets/agents/nova/active.png";
import rookIdle     from "@assets/agents/rook/idle.png";
import rookSpeak    from "@assets/agents/rook/speak.png";
import rookActive   from "@assets/agents/rook/active.png";
import scribeIdle   from "@assets/agents/scribe/idle.png";
import scribeSpeak  from "@assets/agents/scribe/speak.png";
import scribeActive from "@assets/agents/scribe/active.png";
import sniperIdle   from "@assets/agents/sniper/idle.png";
import sniperSpeak  from "@assets/agents/sniper/speak.png";
import sniperActive from "@assets/agents/sniper/active.png";

interface SpritePoses { idle: string; speak: string; active: string; }

const SPRITE_MAP: Record<string, SpritePoses> = {
  anchor: { idle: anchorIdle, speak: anchorSpeak, active: anchorActive },
  atlas:  { idle: atlasIdle,  speak: atlasSpeak,  active: atlasActive  },
  haven:  { idle: havenIdle,  speak: havenSpeak,  active: havenActive  },
  ignite: { idle: igniteIdle, speak: igniteSpeak, active: igniteActive },
  index:  { idle: indexIdle,  speak: indexSpeak,  active: indexActive  },
  legion: { idle: legionIdle, speak: legionSpeak, active: legionActive },
  meme:   { idle: memeIdle,   speak: memeSpeak,   active: memeActive   },
  nova:   { idle: novaIdle,   speak: novaSpeak,   active: novaActive   },
  rook:   { idle: rookIdle,   speak: rookSpeak,   active: rookActive   },
  scribe: { idle: scribeIdle, speak: scribeSpeak, active: scribeActive },
  sniper: { idle: sniperIdle, speak: sniperSpeak, active: sniperActive },
};

const STAGE_POSITION = new THREE.Vector3(0, 0, 1.5);

interface CharacterSpriteProps {
  poses: SpritePoses;
  isPaged: boolean;
  isSelected: boolean;
  isSpeaking: boolean;
  hovered: boolean;
}

function CharacterSprite({ poses, isPaged, isSelected, isSpeaking, hovered }: CharacterSpriteProps) {
  const [idleTex, speakTex, activeTex] = useTexture([poses.idle, poses.speak, poses.active]);
  const meshRef = useRef<THREE.Mesh>(null);

  const activeTex_ = isSpeaking ? speakTex : (isPaged || isSelected) ? activeTex : idleTex;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.map = activeTex_;
    mat.needsUpdate = true;
    if (isSpeaking) {
      mat.opacity = 1.0;
    } else if (isPaged) {
      mat.opacity = 1.0;
    } else if (isSelected || hovered) {
      mat.opacity = 1.0;
    } else {
      mat.opacity = 1.0;
    }
  });

  return (
    <Billboard>
      {/* Shadow oval so feet look grounded — circleGeometry scaled to oval shape */}
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

interface AvatarAgentProps {
  agent: Agent;
  isSelected: boolean;
  isSpeaking: boolean;
  isPaged: boolean;
  isSpecialtyHighlighted: boolean;
  isSpecialtyDimmed: boolean;
  onSelect: (agent: Agent) => void;
}

export function AvatarAgent({ agent, isSelected, isSpeaking, isPaged, isSpecialtyHighlighted, isSpecialtyDimmed, onSelect }: AvatarAgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const specialtyRingRef = useRef<THREE.Mesh>(null);
  const specialtyLabelRef = useRef<{ fillOpacity: number; scale: THREE.Vector3 } | null>(null);
  const specialtyLabelBillboardRef = useRef<THREE.Group>(null);
  const specialtyLabelOpacity = useRef(0);
  const specialtyPillRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const timeOffset = useRef(Math.random() * Math.PI * 2);
  const wasDimmedRef = useRef(false);

  const origin = useRef(new THREE.Vector3(...agent.position));
  const currentXZ = useRef(new THREE.Vector2(agent.position[0], agent.position[2]));

  const poses = SPRITE_MAP[agent.id];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + timeOffset.current;

    const targetX = isPaged ? STAGE_POSITION.x : origin.current.x;
    const targetZ = isPaged ? STAGE_POSITION.z : origin.current.z;
    currentXZ.current.x = THREE.MathUtils.lerp(currentXZ.current.x, targetX, 0.06);
    currentXZ.current.y = THREE.MathUtils.lerp(currentXZ.current.y, targetZ, 0.06);
    groupRef.current.position.x = currentXZ.current.x;
    groupRef.current.position.z = currentXZ.current.y;

    groupRef.current.position.y = agent.position[1] + Math.sin(t * 0.8) * 0.04;

    const targetScale = isPaged ? 1.35 : 1;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.06)
    );

    if (!poses) {
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.1;
    }

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
      mat.opacity = isPaged
        ? 0.4 + Math.sin(t * 2) * 0.15
        : isSelected
        ? 0.3 + Math.sin(t * 3) * 0.15
        : hovered
        ? 0.15 + Math.sin(t * 2) * 0.05
        : 0.05 + Math.sin(t) * 0.03;
    }

    if (auraRef.current) {
      auraRef.current.rotation.z = t * (isPaged ? 1.2 : 0.5);
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isPaged
        ? 0.5 + Math.sin(t * 4) * 0.2
        : isSpeaking
        ? 0.4 + Math.sin(t * 8) * 0.2
        : isSelected
        ? 0.2
        : 0;
    }

    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isPaged ? 0.12 + Math.sin(t * 1.5) * 0.05 : 0;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.08);
    }

    if (specialtyRingRef.current) {
      const mat = specialtyRingRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isSpecialtyHighlighted ? 0.55 + Math.sin(t * 3) * 0.25 : 0;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.08);
      specialtyRingRef.current.rotation.z = t * 1.5;
      specialtyRingRef.current.scale.setScalar(
        1 + (isSpecialtyHighlighted ? Math.sin(t * 2) * 0.06 : 0)
      );
    }

    if (specialtyLabelRef.current) {
      const targetLabelOpacity = isSpecialtyHighlighted ? 1 : 0;
      specialtyLabelOpacity.current = THREE.MathUtils.lerp(
        specialtyLabelOpacity.current,
        targetLabelOpacity,
        0.08
      );
      specialtyLabelRef.current.fillOpacity = specialtyLabelOpacity.current;

      const targetScale = isSpecialtyHighlighted
        ? 1 + Math.sin(t * 2.5) * 0.06
        : 1;
      const curScale = specialtyLabelRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(curScale, targetScale, 0.12);
      specialtyLabelRef.current.scale.setScalar(nextScale);
    }

    if (specialtyPillRef.current) {
      const mat = specialtyPillRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = specialtyLabelOpacity.current * 0.3;
    }

    if (specialtyLabelBillboardRef.current) {
      const restingY = poses ? 2.85 : 3.1;
      const bobOffset = isSpecialtyHighlighted ? Math.sin(t * 1.8) * 0.08 : 0;
      specialtyLabelBillboardRef.current.position.y = THREE.MathUtils.lerp(
        specialtyLabelBillboardRef.current.position.y,
        restingY + bobOffset,
        0.1
      );
    }

    if ((isSpecialtyDimmed || wasDimmedRef.current) && groupRef.current) {
      const effectMeshes = new Set<THREE.Mesh>([
        glowRef.current, auraRef.current, beamRef.current, specialtyRingRef.current,
      ].filter((m): m is THREE.Mesh => m !== null));

      const targetOpacity = isSpecialtyDimmed ? 0.3 : 1;
      let allSettled = true;

      groupRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || effectMeshes.has(mesh)) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats as THREE.Material[]) {
          if (!m) continue;
          m.transparent = isSpecialtyDimmed;
          const cur = m.opacity ?? 1;
          const next = THREE.MathUtils.lerp(cur, targetOpacity, 0.06);
          m.opacity = next;
          if (Math.abs(next - targetOpacity) > 0.01) allSettled = false;
        }
      });

      wasDimmedRef.current = isSpecialtyDimmed || !allSettled;
    }
  });

  return (
    <group
      ref={groupRef}
      position={agent.position}
      onClick={() => onSelect(agent)}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* Stage beam */}
      <mesh ref={beamRef} position={[0, 6, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 12, 32, 1, true]} />
        <meshBasicMaterial color={agent.color} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Ground glow */}
      <Circle ref={glowRef} args={[1.2, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <meshBasicMaterial color={agent.color} transparent opacity={0.05} side={THREE.DoubleSide} />
      </Circle>

      {/* Spinning aura ring */}
      <Ring ref={auraRef} args={[1.1, 1.5, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.39, 0]}>
        <meshBasicMaterial color={agent.accentColor} transparent opacity={0} side={THREE.DoubleSide} />
      </Ring>

      {/* Specialty highlight ring */}
      <Ring ref={specialtyRingRef} args={[1.6, 2.2, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.38, 0]}>
        <meshBasicMaterial color={agent.accentColor} transparent opacity={0} side={THREE.DoubleSide} />
      </Ring>

      {/* Character: real photo sprite OR geometric robot fallback */}
      {poses ? (
        <CharacterSprite
          poses={poses}
          isPaged={isPaged}
          isSelected={isSelected}
          isSpeaking={isSpeaking}
          hovered={hovered}
        />
      ) : (
        <>
          <mesh ref={bodyRef} position={[0, 0.2, 0]} castShadow>
            <capsuleGeometry args={[0.38, 1.2, 8, 16]} />
            <meshStandardMaterial color={agent.color} roughness={0.3} metalness={0.6} emissive={agent.color}
              emissiveIntensity={isPaged ? 0.6 : isSelected ? 0.4 : hovered ? 0.2 : 0.1} />
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
            <meshStandardMaterial color={agent.accentColor} roughness={0.2} metalness={0.7} emissive={agent.accentColor}
              emissiveIntensity={isPaged ? 0.8 : isSelected ? 0.5 : 0.2} />
          </mesh>
          <mesh position={[0, 1.72, 0.28]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
            <meshStandardMaterial color="#0a0a1a" roughness={0.0} metalness={1.0}
              emissive={isSpeaking || isPaged ? agent.color : "#001122"}
              emissiveIntensity={isSpeaking ? 0.8 : isPaged ? 0.5 : 0.3} />
          </mesh>
          <mesh position={[-0.12, 1.76, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={agent.accentColor} emissive={agent.accentColor} emissiveIntensity={isSpeaking || isPaged ? 2.5 : 1} roughness={0} metalness={0} />
          </mesh>
          <mesh position={[0.12, 1.76, 0.35]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={agent.accentColor} emissive={agent.accentColor} emissiveIntensity={isSpeaking || isPaged ? 2.5 : 1} roughness={0} metalness={0} />
          </mesh>
        </>
      )}

      {(isSelected || isPaged) && (
        <pointLight color={agent.color} intensity={isPaged ? 4 : 2} distance={isPaged ? 8 : 5} position={[0, 2, 0]} />
      )}
      {isPaged && (
        <spotLight color={agent.accentColor} intensity={3} distance={15} angle={Math.PI / 6} penumbra={0.5} position={[0, 8, 0]} target-position={[0, 0, 0]} />
      )}

      {/* Specialty badge — only fades in when specialty filter is active */}
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

      {/* Name label — just above the head; title only appears on hover/select */}
      <Billboard position={[0, poses ? 2.2 : 2.5, 0]}>
        <Text
          fontSize={isPaged ? 0.28 : 0.22}
          color={isPaged || isSelected || hovered ? agent.accentColor : "white"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="black"
        >
          {agent.name}
        </Text>
        {(hovered || isSelected || isPaged) && (
          <Text
            position={[0, -0.34, 0]}
            fontSize={0.13}
            color={agent.accentColor}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
          >
            {isPaged ? "◉ ON STAGE" : agent.title}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
