import { useState } from "react";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

// ─── Agent brand colors (used for door accents) ────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  atlas:  "#F59E0B",
  nova:   "#3B82F6",
  rook:   "#4B5563",
  anchor: "#14B8A6",
  sniper: "#F97316",
  meme:   "#EC4899",
  ignite: "#EF4444",
  haven:  "#10B981",
  index:  "#8B5CF6",
  scribe: "#FBBF24",
  legion: "#6366F1",
};

// ─── Layout constants ──────────────────────────────────────────────────────────
const FY     = -1.5;   // floor y
const HH     = 5.5;    // hallway height
const CY     = FY + HH; // ceiling y = 4.0
const DOOR_W = 1.4;
const DOOR_H = 2.7;

// ─── HallwayDoor ───────────────────────────────────────────────────────────────
function HallwayDoor({
  agentId,
  position,
  rotY = 0,
  onDoorClick,
}: {
  agentId: string;
  position: [number, number, number];
  rotY?: number;
  onDoorClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isRestricted = agentId === "rook";
  const color    = isRestricted ? "#4B5563" : (AGENT_COLORS[agentId] ?? "#F97316");
  const dimColor = isRestricted ? "#374151" : color;

  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={(e) => { e.stopPropagation(); if (!isRestricted) onDoorClick(agentId); }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = isRestricted ? "not-allowed" : "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* Door outer frame */}
      <mesh position={[0, DOOR_H / 2, 0]} castShadow>
        <boxGeometry args={[DOOR_W + 0.2, DOOR_H + 0.18, 0.14]} />
        <meshStandardMaterial color="#0f1018" roughness={0.35} metalness={0.9} />
      </mesh>

      {/* Door panel */}
      <mesh position={[0, DOOR_H / 2, 0.08]}>
        <boxGeometry args={[DOOR_W, DOOR_H, 0.06]} />
        <meshStandardMaterial
          color={hovered && !isRestricted ? "#1c1c28" : "#131318"}
          roughness={0.2}
          metalness={0.85}
          emissive={dimColor}
          emissiveIntensity={hovered && !isRestricted ? 0.1 : 0.025}
        />
      </mesh>

      {/* Bottom accent stripe */}
      <mesh position={[0, 0.22, 0.13]}>
        <boxGeometry args={[DOOR_W - 0.1, 0.065, 0.018]} />
        <meshStandardMaterial color={dimColor} emissive={dimColor} emissiveIntensity={isRestricted ? 0.35 : 0.85} roughness={0} metalness={0} />
      </mesh>

      {/* Top accent stripe */}
      <mesh position={[0, DOOR_H - 0.14, 0.13]}>
        <boxGeometry args={[DOOR_W - 0.1, 0.045, 0.018]} />
        <meshStandardMaterial color={dimColor} emissive={dimColor} emissiveIntensity={isRestricted ? 0.25 : 0.65} roughness={0} metalness={0} />
      </mesh>

      {/* Left side stripe */}
      <mesh position={[-(DOOR_W / 2) + 0.07, DOOR_H / 2, 0.13]}>
        <boxGeometry args={[0.04, DOOR_H - 0.1, 0.015]} />
        <meshStandardMaterial color={dimColor} emissive={dimColor} emissiveIntensity={isRestricted ? 0.2 : 0.5} roughness={0} metalness={0} />
      </mesh>

      {/* Door handle */}
      {!isRestricted && (
        <mesh position={[DOOR_W / 2 - 0.2, DOOR_H / 2, 0.14]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.8 : 0.3} roughness={0} metalness={0.5} />
        </mesh>
      )}

      {/* Lock icon for Rook */}
      {isRestricted && (
        <mesh position={[0, DOOR_H / 2, 0.14]}>
          <boxGeometry args={[0.28, 0.38, 0.04]} />
          <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.8} />
        </mesh>
      )}

      {/* Agent name above door */}
      <Billboard position={[0, DOOR_H + 0.52, 0.1]}>
        <Text
          fontSize={0.165}
          color={isRestricted ? "#6B7280" : color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor="#000"
        >
          {agentId.toUpperCase()}
        </Text>
      </Billboard>

      {/* RESTRICTED badge */}
      {isRestricted && (
        <Billboard position={[0, DOOR_H / 2, 0.18]}>
          <Text
            fontSize={0.105}
            color="#6B7280"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000"
          >
            ⚠ RESTRICTED
          </Text>
        </Billboard>
      )}

      {/* Hover glow light */}
      {hovered && !isRestricted && (
        <pointLight position={[0, DOOR_H / 2, 0.9]} color={color} intensity={1.8} distance={3.5} />
      )}
    </group>
  );
}

// ─── Hallway arch (lobby entrance indicator) ───────────────────────────────────
function HallwayArch({
  position,
  rotY = 0,
  width,
  label,
}: {
  position: [number, number, number];
  rotY?: number;
  width: number;
  label: string;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Left pillar */}
      <mesh position={[-(width / 2 + 0.12), HH / 2, 0]}>
        <boxGeometry args={[0.22, HH, 0.22]} />
        <meshStandardMaterial color="#0f1018" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[width / 2 + 0.12, HH / 2, 0]}>
        <boxGeometry args={[0.22, HH, 0.22]} />
        <meshStandardMaterial color="#0f1018" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Top beam */}
      <mesh position={[0, HH + 0.1, 0]}>
        <boxGeometry args={[width + 0.55, 0.2, 0.22]} />
        <meshStandardMaterial color="#0f1018" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Top beam accent strip */}
      <mesh position={[0, HH + 0.01, 0.12]}>
        <boxGeometry args={[width + 0.2, 0.045, 0.02]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.9} roughness={0} metalness={0} />
      </mesh>
      {/* Pillar base rings */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * (width / 2 + 0.12), 0.1, 0]}>
          <torusGeometry args={[0.15, 0.025, 6, 12]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Wing label */}
      <Billboard position={[0, HH + 0.65, 0.05]}>
        <Text fontSize={0.17} color="#F97316" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Left Hallway ──────────────────────────────────────────────────────────────
//   Branches LEFT (−x) from the lobby left wall opening.
//   x: -13 → -32   |   z: -3 → -7   (4 wide, 19 long)
//   7 doors on north wall (z = -7): Atlas, Nova, Anchor, Meme, Scribe, Legion, Rook

const LEFT_CORRIDOR = {
  x0: -13, x1: -32,
  z0: -3,  z1: -7,
  cx: -22.5, cz: -5,
  len: 19, wid: 4,
};
const LC = LEFT_CORRIDOR;

const LEFT_DOORS = [
  { id: "atlas",  x: -15.5 },
  { id: "nova",   x: -18.0 },
  { id: "anchor", x: -20.5 },
  { id: "meme",   x: -23.0 },
  { id: "scribe", x: -25.5 },
  { id: "legion", x: -28.0 },
  { id: "rook",   x: -30.5 },
];

function LeftHallway({ onDoorClick }: { onDoorClick: (id: string) => void }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[LC.cx, FY, LC.cz]} receiveShadow>
        <boxGeometry args={[LC.len, 0.1, LC.wid]} />
        <meshStandardMaterial color="#1a1206" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Floor center accent strip */}
      <mesh position={[LC.cx, FY + 0.012, LC.cz]}>
        <boxGeometry args={[LC.len - 0.4, 0.008, 0.16]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.45} roughness={0} metalness={0} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[LC.cx, CY, LC.cz]}>
        <boxGeometry args={[LC.len, 0.14, LC.wid]} />
        <meshStandardMaterial color="#0e0e14" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Ceiling strip light */}
      <mesh position={[LC.cx, CY - 0.08, LC.cz]}>
        <boxGeometry args={[LC.len - 0.6, 0.04, 0.28]} />
        <meshBasicMaterial color="#ffe0c0" />
      </mesh>
      {/* Ceiling point lights */}
      {[-16, -22, -28].map((x, i) => (
        <pointLight key={i} position={[x, CY - 0.6, LC.cz]} intensity={1.6} color="#ffe0b0" distance={10} />
      ))}

      {/* South wall (z = -3) */}
      <mesh position={[LC.cx, FY + HH / 2, LC.z0]}>
        <boxGeometry args={[LC.len, HH, 0.14]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* South wall panel accents */}
      {[-15.5, -18, -20.5, -23, -25.5, -28, -30.5].map((x, i) => (
        <mesh key={i} position={[x, FY + 1.2, LC.z0 + 0.08]}>
          <boxGeometry args={[0.85, 1.8, 0.06]} />
          <meshStandardMaterial color="#1a1820" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* North wall (z = -7) — doors attach here */}
      <mesh position={[LC.cx, FY + HH / 2, LC.z1]}>
        <boxGeometry args={[LC.len, HH, 0.14]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>

      {/* End wall (x = -32) */}
      <mesh position={[LC.x1, FY + HH / 2, LC.cz]}>
        <boxGeometry args={[0.14, HH, LC.wid]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* End wall "NEXT LEVEL" branding */}
      <Billboard position={[LC.x1 + 0.2, FY + 2.2, LC.cz]}>
        <Text fontSize={0.22} color="#F97316" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          NEXT LEVEL
        </Text>
      </Billboard>

      {/* Wall sconces on south wall */}
      {[-17, -22, -27].map((x, i) => (
        <group key={i} position={[x, FY + 2.8, LC.z0 + 0.14]}>
          <mesh>
            <boxGeometry args={[0.1, 0.32, 0.18]} />
            <meshStandardMaterial color="#1c1a18" roughness={0.35} metalness={0.9} />
          </mesh>
          <pointLight position={[0, -0.3, 0.2]} color="#FF9240" intensity={0.9} distance={5} />
        </group>
      ))}

      {/* Entrance arch (lobby side) */}
      <HallwayArch
        position={[LC.x0 - 0.15, FY, LC.cz]}
        rotY={Math.PI / 2}
        width={LC.wid}
        label="◈ STRATEGY WING"
      />

      {/* Doors — north wall (face into corridor: rotY = 0, z offset toward corridor) */}
      {LEFT_DOORS.map((d) => (
        <HallwayDoor
          key={d.id}
          agentId={d.id}
          position={[d.x, FY, LC.z1 + 0.09]}
          rotY={0}
          onDoorClick={onDoorClick}
        />
      ))}
    </group>
  );
}

// ─── Center Hallway ────────────────────────────────────────────────────────────
//   Branches BACK (−z) from the lobby rear wall.
//   z: -14.5 → -27   |   x: -3 → +3   (6 wide, 12.5 long)
//   2 doors on left wall  (x = -3): Sniper, Haven
//   2 doors on right wall (x = +3): Ignite, Index

const CENTER_CORRIDOR = {
  x0: -3,  x1: 3,
  z0: -14.5, z1: -27,
  cx: 0, cz: -20.75,
  len: 12.5, wid: 6,
};
const CC = CENTER_CORRIDOR;

const CENTER_LEFT_DOORS  = [{ id: "sniper", z: -18.0 }, { id: "haven",  z: -23.0 }];
const CENTER_RIGHT_DOORS = [{ id: "ignite", z: -18.0 }, { id: "index",  z: -23.0 }];

function CenterHallway({ onDoorClick }: { onDoorClick: (id: string) => void }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[CC.cx, FY, CC.cz]} receiveShadow>
        <boxGeometry args={[CC.wid, 0.1, CC.len]} />
        <meshStandardMaterial color="#1a1206" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Floor center strip */}
      <mesh position={[CC.cx, FY + 0.012, CC.cz]}>
        <boxGeometry args={[0.16, 0.008, CC.len - 0.4]} />
        <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.45} roughness={0} metalness={0} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[CC.cx, CY, CC.cz]}>
        <boxGeometry args={[CC.wid, 0.14, CC.len]} />
        <meshStandardMaterial color="#0e0e14" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Ceiling strip light */}
      <mesh position={[CC.cx, CY - 0.08, CC.cz]}>
        <boxGeometry args={[0.28, 0.04, CC.len - 0.6]} />
        <meshBasicMaterial color="#ffe0c0" />
      </mesh>
      {[-17, -21, -25].map((z, i) => (
        <pointLight key={i} position={[CC.cx, CY - 0.6, z]} intensity={1.6} color="#ffe0b0" distance={10} />
      ))}

      {/* Left wall (x = -3) — doors on this side */}
      <mesh position={[CC.x0, FY + HH / 2, CC.cz]}>
        <boxGeometry args={[0.14, HH, CC.len]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>

      {/* Right wall (x = +3) — doors on this side */}
      <mesh position={[CC.x1, FY + HH / 2, CC.cz]}>
        <boxGeometry args={[0.14, HH, CC.len]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>

      {/* End wall (z = -27) */}
      <mesh position={[CC.cx, FY + HH / 2, CC.z1]}>
        <boxGeometry args={[CC.wid, HH, 0.14]} />
        <meshStandardMaterial color="#111318" roughness={0.55} metalness={0.45} />
      </mesh>
      <Billboard position={[CC.cx, FY + 2.2, CC.z1 + 0.2]}>
        <Text fontSize={0.22} color="#F97316" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          NEXT LEVEL
        </Text>
      </Billboard>

      {/* Wall sconces on left wall */}
      {[-16.5, -20.5, -24.5].map((z, i) => (
        <group key={i} position={[CC.x0 - 0.14, FY + 2.8, z]}>
          <mesh>
            <boxGeometry args={[0.18, 0.32, 0.1]} />
            <meshStandardMaterial color="#1c1a18" roughness={0.35} metalness={0.9} />
          </mesh>
          <pointLight position={[-0.2, -0.3, 0]} color="#FF9240" intensity={0.9} distance={5} />
        </group>
      ))}
      {/* Wall sconces on right wall */}
      {[-16.5, -20.5, -24.5].map((z, i) => (
        <group key={i} position={[CC.x1 + 0.14, FY + 2.8, z]}>
          <mesh>
            <boxGeometry args={[0.18, 0.32, 0.1]} />
            <meshStandardMaterial color="#1c1a18" roughness={0.35} metalness={0.9} />
          </mesh>
          <pointLight position={[0.2, -0.3, 0]} color="#FF9240" intensity={0.9} distance={5} />
        </group>
      ))}

      {/* Entrance arch (lobby side) */}
      <HallwayArch
        position={[CC.cx, FY, CC.z0 - 0.15]}
        rotY={0}
        width={CC.wid}
        label="◈ OPS WING"
      />

      {/* Left wall doors: face into corridor = +x direction, rotY = -π/2 */}
      {CENTER_LEFT_DOORS.map((d) => (
        <HallwayDoor
          key={d.id}
          agentId={d.id}
          position={[CC.x0 - 0.09, FY, d.z]}
          rotY={-Math.PI / 2}
          onDoorClick={onDoorClick}
        />
      ))}

      {/* Right wall doors: face into corridor = −x direction, rotY = +π/2 */}
      {CENTER_RIGHT_DOORS.map((d) => (
        <HallwayDoor
          key={d.id}
          agentId={d.id}
          position={[CC.x1 + 0.09, FY, d.z]}
          rotY={Math.PI / 2}
          onDoorClick={onDoorClick}
        />
      ))}
    </group>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────
export function Hallways({ onDoorClick }: { onDoorClick: (agentId: string) => void }) {
  return (
    <>
      <LeftHallway   onDoorClick={onDoorClick} />
      <CenterHallway onDoorClick={onDoorClick} />
    </>
  );
}
