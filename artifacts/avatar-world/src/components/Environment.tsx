import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Seeded random ─────────────────────────────────────────────────────────────
function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── City buildings (far background) ──────────────────────────────────────────
function genWindows(w: number, h: number, d: number, seed: number) {
  const out: { pos: [number, number, number]; color: string; opacity: number }[] = [];
  const rowH = 3.2, colW = 2.5;
  const rows = Math.floor(h / rowH), cols = Math.floor(w / colW);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s1 = sr(seed + r * 97 + c * 13);
      if (s1 > 0.4) {
        const s2 = sr(seed + r * 97 + c * 13 + 200);
        const s3 = sr(seed + r * 97 + c * 13 + 400);
        out.push({
          pos: [(c - cols / 2 + 0.5) * colW, -h / 2 + (r + 0.5) * rowH + rowH / 2, d / 2 + 0.05],
          color: s2 > 0.88 ? "#F97316" : s2 > 0.55 ? "#fff4dc" : "#c89010",
          opacity: 0.42 + s3 * 0.38,
        });
      }
    }
  }
  return out;
}

function CityBuilding({ position, w, h, d, seed = 0 }: {
  position: [number, number, number]; w: number; h: number; d: number; seed?: number;
}) {
  const windows = useMemo(() => genWindows(w, h, d, seed), [w, h, d, seed]);
  return (
    <group position={position}>
      <mesh><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#060a0e" roughness={0.88} metalness={0.18} /></mesh>
      {windows.map((win, i) => (
        <mesh key={i} position={win.pos}>
          <planeGeometry args={[1.6, 2.2]} />
          <meshBasicMaterial color={win.color} transparent opacity={win.opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Floor ────────────────────────────────────────────────────────────────────
function MainFloor() {
  return (
    <>
      {/* Base dark polished floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshStandardMaterial color="#121008" roughness={0.15} metalness={0.55} />
      </mesh>
      {/* Warm wood-plank overlay in center zone — Sims living area feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.495, -5]}>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#1e1208" roughness={0.82} metalness={0.02} />
      </mesh>
      {/* Wood plank lines */}
      {[-6, -4, -2, 0, 2, 4, 6].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.493, -5]}>
          <planeGeometry args={[0.03, 14]} />
          <meshStandardMaterial color="#0e0904" roughness={0.9} metalness={0} />
        </mesh>
      ))}
      {/* Lounge area rug — left side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, -1.492, -2.5]}>
        <planeGeometry args={[5.5, 5]} />
        <meshStandardMaterial color="#1a0f1e" roughness={0.98} metalness={0} />
      </mesh>
      {/* Rug border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, -1.491, -2.5]}>
        <planeGeometry args={[5.7, 5.2]} />
        <meshStandardMaterial color="#2a1535" roughness={0.98} metalness={0} wireframe />
      </mesh>
      {/* Workspace rug — right side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10.5, -1.492, -5.5]}>
        <planeGeometry args={[4.5, 7]} />
        <meshStandardMaterial color="#0e130e" roughness={0.98} metalness={0} />
      </mesh>
    </>
  );
}

// ─── Walls ────────────────────────────────────────────────────────────────────
function Walls() {
  const wallColor = "#13100c";
  const panelColor = "#1a1510";
  const accentColor = "#F97316";
  return (
    <group>
      {/* Left wall */}
      <mesh position={[-13.2, 4, -6]}>
        <boxGeometry args={[0.25, 12, 18]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Right wall */}
      <mesh position={[13.2, 4, -6]}>
        <boxGeometry args={[0.25, 12, 18]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Left wall dado rail panels */}
      {[-2, -5, -8, -11].map((z, i) => (
        <mesh key={i} position={[-12.9, 0.8, z]}>
          <boxGeometry args={[0.08, 2.2, 2.4]} />
          <meshStandardMaterial color={panelColor} roughness={0.75} metalness={0.2} />
        </mesh>
      ))}
      {/* Right wall dado rail panels */}
      {[-2, -5, -8, -11].map((z, i) => (
        <mesh key={i} position={[12.9, 0.8, z]}>
          <boxGeometry args={[0.08, 2.2, 2.4]} />
          <meshStandardMaterial color={panelColor} roughness={0.75} metalness={0.2} />
        </mesh>
      ))}
      {/* Left wall orange accent strip */}
      <mesh position={[-13.1, -0.1, -6]}>
        <boxGeometry args={[0.06, 0.06, 18]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.45} />
      </mesh>
      {/* Right wall orange accent strip */}
      <mesh position={[13.1, -0.1, -6]}>
        <boxGeometry args={[0.06, 0.06, 18]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.45} />
      </mesh>
      {/* Front partial wall edges */}
      <mesh position={[-13.2, 4, 2.5]}>
        <boxGeometry args={[0.25, 12, 3]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[13.2, 4, 2.5]}>
        <boxGeometry args={[0.25, 12, 3]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ─── Ceiling ──────────────────────────────────────────────────────────────────
function Ceiling() {
  const panels: [number, number][] = [
    [-10, -6], [0, -6], [10, -6],
    [-10, 0],  [0, 0],  [10, 0],
  ];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#111008" roughness={0.95} />
      </mesh>
      {panels.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 9.93, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 1.0]} />
            <meshBasicMaterial color="#ffe8d0" transparent opacity={0.82} />
          </mesh>
          <pointLight position={[x, 9.2, z]} intensity={1.1} color="#ffe8d0" distance={14} />
        </group>
      ))}
    </group>
  );
}

// ─── Architectural Columns ────────────────────────────────────────────────────
function Column({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -1.5, z]}>
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 11, 8]} />
        <meshStandardMaterial color="#16130e" roughness={0.45} metalness={0.7} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, 11.1, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.7]} />
        <meshStandardMaterial color="#1e1a14" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.6, 0.18, 0.6]} />
        <meshStandardMaterial color="#1e1a14" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Orange base ring */}
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.3, 0.025, 6, 12]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Plant ────────────────────────────────────────────────────────────────────
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 0.32, 10]} />
        <meshStandardMaterial color="#3a2412" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Soil top */}
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.19, 10]} />
        <meshStandardMaterial color="#1a1008" roughness={0.99} />
      </mesh>
      {/* Main leaf mass */}
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.38, 9, 7]} />
        <meshStandardMaterial color="#1a3d0a" roughness={0.95} metalness={0} />
      </mesh>
      {/* Highlight cluster */}
      <mesh position={[0.15, 0.88, 0.1]}>
        <sphereGeometry args={[0.2, 7, 6]} />
        <meshStandardMaterial color="#235010" roughness={0.92} />
      </mesh>
      <mesh position={[-0.1, 0.82, 0.15]}>
        <sphereGeometry args={[0.15, 6, 5]} />
        <meshStandardMaterial color="#1e4508" roughness={0.93} />
      </mesh>
    </group>
  );
}

// ─── Floor Lamp ───────────────────────────────────────────────────────────────
function FloorLamp({ position, color = "#F97316" }: {
  position: [number, number, number]; color?: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.08;
  });
  return (
    <group position={position}>
      {/* Base disc */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.22, 0.25, 0.1, 10]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.45} metalness={0.85} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.65, 6]} />
        <meshStandardMaterial color="#1a1814" roughness={0.3} metalness={0.92} />
      </mesh>
      {/* Shade body */}
      <mesh ref={ref} position={[0, 1.73, 0]}>
        <coneGeometry args={[0.28, 0.38, 10, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.58} side={THREE.DoubleSide} />
      </mesh>
      {/* Shade top ring */}
      <mesh position={[0, 1.9, 0]}>
        <torusGeometry args={[0.08, 0.018, 6, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={2.2} color={color} distance={7} />
    </group>
  );
}

// ─── Desk ────────────────────────────────────────────────────────────────────
function Desk({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Tabletop */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.07, 0.85]} />
        <meshStandardMaterial color="#2e1c0e" roughness={0.55} metalness={0.08} />
      </mesh>
      {/* Tabletop edge strip */}
      <mesh position={[0, 0.72, -0.425]}>
        <boxGeometry args={[1.85, 0.06, 0.015]} />
        <meshStandardMaterial color="#F97316" roughness={0.3} metalness={0.6} emissive="#F97316" emissiveIntensity={0.2} />
      </mesh>
      {/* Legs */}
      {[[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.37, lz]} castShadow>
          <boxGeometry args={[0.06, 0.76, 0.06]} />
          <meshStandardMaterial color="#1e0e06" roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 1.35, -0.3]} castShadow>
        <boxGeometry args={[0.9, 0.56, 0.055]} />
        <meshStandardMaterial color="#0e1014" roughness={0.25} metalness={0.92}
          emissive="#0a2040" emissiveIntensity={0.55} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.88, -0.3]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color="#181c20" roughness={0.35} metalness={0.9} />
      </mesh>
      {/* Monitor stand base */}
      <mesh position={[0, 0.76, -0.28]}>
        <boxGeometry args={[0.26, 0.025, 0.18]} />
        <meshStandardMaterial color="#181c20" roughness={0.4} metalness={0.9} />
      </mesh>
      {/* Keyboard suggestion */}
      <mesh position={[0, 0.775, 0.08]}>
        <boxGeometry args={[0.65, 0.018, 0.22]} />
        <meshStandardMaterial color="#181a1e" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Monitor glow */}
      <pointLight position={[0, 1.3, -0.1]} intensity={0.4} color="#4080c0" distance={2.5} />
    </group>
  );
}

// ─── Chair ────────────────────────────────────────────────────────────────────
function Chair({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.52, 0.09, 0.52]} />
        <meshStandardMaterial color="#1e1826" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.82, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.66, 0.07]} />
        <meshStandardMaterial color="#1e1826" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Arm rests */}
      {[-0.26, 0.26].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.62, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.5]} />
            <meshStandardMaterial color="#141018" roughness={0.5} metalness={0.8} />
          </mesh>
          <mesh position={[x, 0.64, -0.1]}>
            <boxGeometry args={[0.1, 0.025, 0.28]} />
            <meshStandardMaterial color="#1e1826" roughness={0.88} />
          </mesh>
        </group>
      ))}
      {/* Legs */}
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.22, lz]}>
          <boxGeometry args={[0.04, 0.46, 0.04]} />
          <meshStandardMaterial color="#0e0c10" roughness={0.4} metalness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Sofa ─────────────────────────────────────────────────────────────────────
function Sofa({ position, width = 2.2, rotY = 0 }: {
  position: [number, number, number]; width?: number; rotY?: number;
}) {
  const hw = width / 2;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[width, 0.32, 0.92]} />
        <meshStandardMaterial color="#20143a" roughness={0.96} metalness={0.02} />
      </mesh>
      {/* Seat cushion overlay (slightly lighter) */}
      <mesh position={[0, 0.56, 0.05]}>
        <boxGeometry args={[width - 0.14, 0.08, 0.78]} />
        <meshStandardMaterial color="#2a1c4a" roughness={0.98} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.82, -0.36]} castShadow>
        <boxGeometry args={[width, 0.72, 0.24]} />
        <meshStandardMaterial color="#20143a" roughness={0.96} />
      </mesh>
      {/* Back cushion overlay */}
      <mesh position={[0, 0.9, -0.24]}>
        <boxGeometry args={[width - 0.14, 0.55, 0.1]} />
        <meshStandardMaterial color="#2a1c4a" roughness={0.98} />
      </mesh>
      {/* Armrests */}
      {[-hw, hw].map((x, i) => (
        <mesh key={i} position={[x + (i === 0 ? 0.13 : -0.13), 0.58, 0]} castShadow>
          <boxGeometry args={[0.24, 0.48, 0.92]} />
          <meshStandardMaterial color="#20143a" roughness={0.95} />
        </mesh>
      ))}
      {/* Legs */}
      {[[-hw + 0.22, -0.38], [hw - 0.22, -0.38], [-hw + 0.22, 0.38], [hw - 0.22, 0.38]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.1, lz]}>
          <boxGeometry args={[0.07, 0.22, 0.07]} />
          <meshStandardMaterial color="#0e0c10" roughness={0.4} metalness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Coffee Table ─────────────────────────────────────────────────────────────
function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.065, 12]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Tabletop edge */}
      <mesh position={[0, 0.44, 0]}>
        <torusGeometry args={[0.55, 0.022, 6, 12]} />
        <meshStandardMaterial color="#F97316" roughness={0.4} metalness={0.7} emissive="#F97316" emissiveIntensity={0.15} />
      </mesh>
      {/* Center column */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.42, 8]} />
        <meshStandardMaterial color="#1a1410" roughness={0.4} metalness={0.85} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 12]} />
        <meshStandardMaterial color="#1a1410" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Side table ───────────────────────────────────────────────────────────────
function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshStandardMaterial color="#2e1c0e" roughness={0.55} metalness={0.08} />
      </mesh>
      {/* Small lamp on the table */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.26, 8]} />
        <meshStandardMaterial color="#1a1814" roughness={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <coneGeometry args={[0.15, 0.2, 8, 1, true]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.85, 0]} intensity={1.4} color="#FF9240" distance={4} />
      {/* Legs */}
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.3, lz]}>
          <boxGeometry args={[0.035, 0.62, 0.035]} />
          <meshStandardMaterial color="#0e0c0a" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Bookshelf / Display unit ─────────────────────────────────────────────────
function Shelf({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[1.2, 2.1, 0.35]} />
        <meshStandardMaterial color="#1e1208" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Shelves */}
      {[0.25, 0.75, 1.25, 1.75].map((y, i) => (
        <mesh key={i} position={[0, y, 0.01]}>
          <boxGeometry args={[1.14, 0.04, 0.3]} />
          <meshStandardMaterial color="#2e1c0e" roughness={0.6} metalness={0.08} />
        </mesh>
      ))}
      {/* Decorative items — books/objects on shelves */}
      {[
        { y: 0.38, x: -0.3, color: "#F97316", w: 0.12 },
        { y: 0.38, x: -0.1, color: "#1a3060", w: 0.1 },
        { y: 0.38, x: 0.1,  color: "#3a1a10", w: 0.14 },
        { y: 0.88, x: -0.25, color: "#101820", w: 0.18 },
        { y: 0.88, x: 0.15, color: "#F97316", w: 0.08 },
        { y: 1.38, x: -0.2, color: "#1a2a1a", w: 0.16 },
        { y: 1.38, x: 0.2,  color: "#201010", w: 0.12 },
      ].map((item, i) => (
        <mesh key={i} position={[item.x, item.y, 0.05]}>
          <boxGeometry args={[item.w, 0.2, 0.22]} />
          <meshStandardMaterial color={item.color} roughness={0.85} />
        </mesh>
      ))}
      {/* Orange glow strip on back panel */}
      <mesh position={[0, 1.0, -0.14]}>
        <planeGeometry args={[1.0, 1.9]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// ─── Wall sconce ──────────────────────────────────────────────────────────────
function WallSconce({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.22, 0.22]} />
        <meshStandardMaterial color="#1c1814" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.08, 0]}>
        <coneGeometry args={[0.1, 0.18, 8, 1, true]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0.2, 0.06, 0]} intensity={1.0} color="#FF9240" distance={5} />
    </group>
  );
}

// ─── Background glass wall ────────────────────────────────────────────────────
function BackWall() {
  const mullionXs = [-14.8, -9.2, -3.6, 1.9, 7.5, 13.1];
  const glassPanes = [-12, -6.5, -0.9, 4.7, 10.3];
  return (
    <group>
      {glassPanes.map((x, i) => (
        <mesh key={i} position={[x, 3.5, -14.5]}>
          <planeGeometry args={[5.2, 13]} />
          <meshStandardMaterial color="#7aaec0" transparent opacity={0.045} roughness={0.02} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {mullionXs.map((x, i) => (
        <mesh key={i} position={[x, 3.5, -14.5]}>
          <boxGeometry args={[0.2, 13, 0.16]} />
          <meshStandardMaterial color="#1c2028" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
      {[-3.5, 0, 3.5, 7].map((y, i) => (
        <mesh key={i} position={[0, y, -14.5]}>
          <boxGeometry args={[32, 0.16, 0.14]} />
          <meshStandardMaterial color="#1c2028" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, -1.42, -12.5]}>
        <boxGeometry args={[34, 0.1, 4]} />
        <meshStandardMaterial color="#181c22" roughness={0.45} metalness={0.85} />
      </mesh>
    </group>
  );
}

// ─── Raised platform (for elevated agents) ────────────────────────────────────
function RaisedPlatform({ x, z, agentY, color = "#F97316", radius = 1.4 }: {
  x: number; z: number; agentY: number; color?: string; radius?: number;
}) {
  const surfaceY = agentY - 1.5;
  const height = surfaceY + 1.5;
  return (
    <group position={[x, -1.5, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.1, height, 8]} />
        <meshStandardMaterial color="#1a1208" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Top edge glow */}
      <mesh position={[0, height + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.1, radius, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Steps */}
      {[0.14, 0.06].map((extraR, i) => (
        <mesh key={i} position={[0, i * 0.12, 0]}>
          <cylinderGeometry args={[radius + extraR + 0.08, radius + extraR + 0.12, 0.1, 8]} />
          <meshStandardMaterial color="#141008" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <pointLight position={[0, height + 0.5, 0]} intensity={1.2} color={color} distance={6} />
    </group>
  );
}

// ─── Sky / Background ─────────────────────────────────────────────────────────
function SkyBack() {
  return (
    <>
      <mesh position={[0, 18, -82]}><planeGeometry args={[220, 90]} /><meshBasicMaterial color="#030406" /></mesh>
      <mesh position={[0, -4, -78]}><planeGeometry args={[220, 25]} /><meshBasicMaterial color="#060302" /></mesh>
    </>
  );
}

// ─── Main Environment ──────────────────────────────────────────────────────────
export function Environment3D() {
  return (
    <>
      <fog attach="fog" args={["#0d0a08", 35, 120]} />

      {/* Warm ambient — Sims-like interior warmth */}
      <hemisphereLight args={["#d0c4a0", "#1a1008", 0.9]} />
      <ambientLight intensity={1.2} color="#ffe8d0" />

      {/* Main warm directional */}
      <directionalLight position={[0, 10, 6]} intensity={1.8} color="#ffe4c0" castShadow shadow-mapSize={[1024, 1024]} />

      {/* Back cool fill (through the glass wall) */}
      <directionalLight position={[0, 5, -20]} intensity={0.9} color="#6080b0" />

      {/* Warm side fills */}
      <pointLight position={[-10, 3, -5]} intensity={1.4} color="#FF8820" distance={20} />
      <pointLight position={[10, 3, -5]}  intensity={1.4} color="#FF8820" distance={20} />

      {/* Back room fill */}
      <pointLight position={[0, 4, -12]} intensity={1.8} color="#FF7010" distance={30} />

      {/* Center warm glow from below (floor reflection sim) */}
      <pointLight position={[0, -1.0, -4]} intensity={0.9} color="#FF9040" distance={18} />

      {/* Geometry */}
      <MainFloor />
      <Walls />
      <Ceiling />
      <BackWall />

      {/* Architectural columns */}
      <Column x={-10} z={0} />
      <Column x={10}  z={0} />
      <Column x={-10} z={-7} />
      <Column x={10}  z={-7} />
      <Column x={-10} z={-13} />
      <Column x={10}  z={-13} />

      {/* ── Lounge area — left side (safe from rook[-5,-3] and meme[-7,-4]) ── */}
      <Sofa position={[-11.5, -1.5, -1.5]} rotY={Math.PI / 2} />
      <Sofa position={[-9, -1.5, -0.5]} width={1.6} rotY={Math.PI} />
      <CoffeeTable position={[-10, -1.5, -1.8]} />
      <SideTable position={[-11.5, -1.5, 0.5]} />
      <FloorLamp position={[-12.5, -1.5, 0.2]} color="#FF9240" />
      <FloorLamp position={[-12.5, -1.5, -4.5]} color="#FF9240" />
      <Plant position={[-12.5, -1.5, 1.2]} />
      <Plant position={[-12.5, -1.5, -5.5]} />
      <Shelf position={[-12.8, -1.5, -3]} rotY={Math.PI / 2} />

      {/* ── Workstation area — right side (behind sniper at [7.5,-5]) ── */}
      <Desk position={[11.5, -1.5, -4]} rotY={-Math.PI / 2} />
      <Chair position={[10.1, -1.5, -4]} rotY={Math.PI / 2} />
      <Desk position={[11.5, -1.5, -6.5]} rotY={-Math.PI / 2} />
      <Chair position={[10.1, -1.5, -6.5]} rotY={Math.PI / 2} />
      <Desk position={[11.5, -1.5, -9]} rotY={-Math.PI / 2} />
      <Chair position={[10.1, -1.5, -9]} rotY={Math.PI / 2} />
      <FloorLamp position={[12.5, -1.5, -2.5]} color="#F97316" />
      <FloorLamp position={[12.5, -1.5, -8]} color="#F97316" />
      <Plant position={[12.5, -1.5, -1.5]} />
      <Plant position={[12.5, -1.5, -11]} />

      {/* ── Wall sconces for mood lighting ── */}
      <WallSconce position={[-12.95, 2.5, -1]} />
      <WallSconce position={[-12.95, 2.5, -5]} />
      <WallSconce position={[-12.95, 2.5, -9]} />
      <WallSconce position={[12.95, 2.5, -1]} />
      <WallSconce position={[12.95, 2.5, -5]} />
      <WallSconce position={[12.95, 2.5, -9]} />

      {/* ── Raised platforms for elevated agents ── */}
      {/* Sniper — [7.5, 1.2, -5] */}
      <RaisedPlatform x={7.5} z={-5} agentY={1.2} color="#F97316" radius={1.5} />
      {/* Meme — [-7, 1.2, -4] */}
      <RaisedPlatform x={-7} z={-4} agentY={1.2} color="#FB923C" radius={1.5} />
      {/* Haven — [6.5, 1.8, -9] */}
      <RaisedPlatform x={6.5} z={-9} agentY={1.8} color="#F97316" radius={1.6} />

      {/* City skyline (far background) */}
      <CityBuilding position={[1,   20, -56]} w={17} h={56} d={10} seed={1} />
      <CityBuilding position={[-23, 12, -49]} w={13} h={38} d={9}  seed={2} />
      <CityBuilding position={[25,  9,  -51]} w={12} h={32} d={8}  seed={3} />
      <CityBuilding position={[-37, 6,  -55]} w={10} h={26} d={7}  seed={4} />
      <CityBuilding position={[38,  5,  -53]} w={10} h={22} d={7}  seed={5} />

      <SkyBack />
    </>
  );
}
