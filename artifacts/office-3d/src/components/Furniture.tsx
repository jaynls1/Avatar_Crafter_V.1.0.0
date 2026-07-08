import { useStore } from "../store/useStore";

export default function Furniture() {
  const { furnitureConfig } = useStore();
  const { deskColor, chairColor, accentColor } = furnitureConfig;

  return (
    <group>
      {/* Main desk */}
      <group position={[0, 0, -3.5]}>
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.07, 1.4]} />
          <meshStandardMaterial color={deskColor} roughness={0.5} metalness={0.05} />
        </mesh>
        {[[-1.45, -1.4], [-1.45, 0.6], [1.45, -1.4], [1.45, 0.6]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.41, z * 0.5 + 0.05]} castShadow>
            <boxGeometry args={[0.07, 0.82, 0.07]} />
            <meshStandardMaterial color={deskColor} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[2.9, 0.05, 0.06]} />
          <meshStandardMaterial color={deskColor} roughness={0.6} />
        </mesh>
        <group position={[0, 1.1, -0.45]}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.9, 0.05]} />
            <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[1.38, 0.8]} />
            <meshStandardMaterial color="#0a1628" emissive="#0a2040" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, -0.52, 0.08]}>
            <boxGeometry args={[0.08, 0.14, 0.08]} />
            <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, -0.6, 0.18]}>
            <boxGeometry args={[0.45, 0.04, 0.3]} />
            <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
        <mesh position={[0, 0.86, 0.18]} castShadow>
          <boxGeometry args={[0.65, 0.025, 0.22]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.5, 0.86, 0.18]} castShadow>
          <boxGeometry args={[0.1, 0.025, 0.14]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.2} />
        </mesh>
        <group position={[-1.1, 0.86, -0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.04, 12]} />
            <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
            <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0.12, 0.44, 0]} rotation={[0, 0, -Math.PI / 5]} castShadow>
            <coneGeometry args={[0.14, 0.22, 16, 1, true]} />
            <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.5} side={2} />
          </mesh>
          <pointLight position={[0.18, 0.38, 0]} intensity={6} distance={2.5} color="#fff5c8" />
        </group>
        <group position={[0.9, 0.86, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.1, 12]} />
            <meshStandardMaterial color="#c8a050" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.01, 12]} />
            <meshStandardMaterial color="#3d1a00" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Office chair */}
      <group position={[0, 0, -1.6]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.7, 0.09, 0.65]} />
          <meshStandardMaterial color={chairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.1, -0.3]} castShadow>
          <boxGeometry args={[0.68, 0.92, 0.09]} />
          <meshStandardMaterial color={chairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.6, -0.28]} castShadow>
          <boxGeometry args={[0.4, 0.22, 0.09]} />
          <meshStandardMaterial color={chairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.42, 0.05, 5]} />
          <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-0.38, 0.84, -0.08]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.35]} />
          <meshStandardMaterial color={chairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0.38, 0.84, -0.08]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.35]} />
          <meshStandardMaterial color={chairColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Bookshelf (left wall) */}
      <group position={[-7, 0, -2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[2.2, 2.4, 0.35]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.2, -0.15]}>
          <boxGeometry args={[2.1, 2.3, 0.02]} />
          <meshStandardMaterial color="#4a3010" roughness={0.9} />
        </mesh>
        {[0.45, 0.95, 1.45, 1.95].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[2.05, 0.04, 0.33]} />
            <meshStandardMaterial color="#7a5230" roughness={0.7} />
          </mesh>
        ))}
        {[
          { x: -0.8, y: 0.65, w: 0.1, h: 0.18, color: "#c0392b" },
          { x: -0.65, y: 0.65, w: 0.08, h: 0.15, color: "#2980b9" },
          { x: -0.5, y: 0.65, w: 0.12, h: 0.2, color: "#27ae60" },
          { x: -0.32, y: 0.65, w: 0.09, h: 0.16, color: "#8e44ad" },
          { x: -0.16, y: 0.65, w: 0.1, h: 0.18, color: "#e67e22" },
          { x: 0.0, y: 0.65, w: 0.08, h: 0.14, color: "#16a085" },
          { x: 0.8, y: 1.15, w: 0.1, h: 0.18, color: "#c0392b" },
          { x: 0.65, y: 1.15, w: 0.08, h: 0.15, color: "#2c3e50" },
          { x: 0.5, y: 1.15, w: 0.12, h: 0.2, color: "#d35400" },
          { x: 0.32, y: 1.15, w: 0.09, h: 0.16, color: "#1abc9c" },
        ].map((b, i) => (
          <mesh key={i} position={[b.x, b.y, 0.02]} castShadow>
            <boxGeometry args={[b.w, b.h, 0.28]} />
            <meshStandardMaterial color={b.color} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Plant (right corner) */}
      <group position={[6.5, 0, -5]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.44, 12]} />
          <meshStandardMaterial color="#8b4513" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.44, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.02, 12]} />
          <meshStandardMaterial color="#2c1a0a" roughness={0.95} />
        </mesh>
        {[-0.06, 0, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.8 + i * 0.1, 0]} rotation={[0, i * 0.6, i * 0.2 - 0.2]} castShadow>
            <cylinderGeometry args={[0.015, 0.02, 0.75 + i * 0.1, 6]} />
            <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
          </mesh>
        ))}
        {[
          [0, 1.2, 0, 0],
          [0.22, 1.05, 0, 0.4],
          [-0.22, 1.1, 0, -0.4],
          [0.12, 1.35, 0, 0.2],
          [-0.1, 1.3, 0, -0.2],
        ].map(([x, y, z, ry], i) => (
          <mesh key={i} position={[x as number, y as number, z as number]} rotation={[-0.3, ry as number, 0]} castShadow>
            <planeGeometry args={[0.4, 0.16]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#2d7a1e" : "#3d9c2a"} roughness={0.85} side={2} />
          </mesh>
        ))}
      </group>

      {/* Side table */}
      <group position={[5.5, 0, 1]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
          <meshStandardMaterial color={deskColor} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.04, 16]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -1]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#8b3a3a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -1]}>
        <ringGeometry args={[1.85, 2.0, 4]} />
        <meshStandardMaterial color="#5c2020" roughness={0.95} />
      </mesh>
    </group>
  );
}
