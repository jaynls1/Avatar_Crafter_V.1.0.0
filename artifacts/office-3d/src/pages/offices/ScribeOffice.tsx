import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";

const W = 13; const H = 4.5; const D = 13;

function LibraryRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.8} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -4 + i]}>
          <planeGeometry args={[W, 0.025]} />
          <meshStandardMaterial color="#1a0e04" roughness={0.9} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#1a1206" roughness={0.9} />
      </mesh>
      {/* Ceiling beams */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={i} position={[x, H - 0.1, 0]}>
          <boxGeometry args={[0.3, 0.2, D]} />
          <meshStandardMaterial color="#3d2510" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#d4c4a0" roughness={0.88} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#c8b890" roughness={0.88} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#c8b890" roughness={0.88} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position, rotation = [0, 0, 0] as [number, number, number] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const bookData = useMemo(() => Array.from({ length: 32 }, () => ({
    w: 0.1 + Math.random() * 0.08,
    h: 0.18 + Math.random() * 0.16,
    color: ["#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#e67e22", "#16a085", "#2c3e50", "#d35400", "#c8a050", "#8b1a1a"][Math.floor(Math.random() * 10)],
  })), []);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const targetYRef = useRef<number[]>(bookData.map(() => 1));
  const currentYRef = useRef<number[]>(bookData.map(() => Math.random() < 0.5 ? 1 : 0));

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      // Occasionally trigger a new book to appear
      if (Math.random() < delta * 0.04 && targetYRef.current[i] === 1) {
        targetYRef.current[i] = 0;
      }
      // Animate toward target
      currentYRef.current[i] = THREE.MathUtils.lerp(currentYRef.current[i], targetYRef.current[i], delta * 1.5);
      // Book visible = at normal position, invisible = lowered below shelf
      mesh.position.y = currentYRef.current[i] > 0.05 ? 0 : -(1 - currentYRef.current[i]) * 0.25;
      mesh.scale.y = 0.2 + currentYRef.current[i] * 0.8;
    });
  });

  let xOffset = 0;
  const bookPositions = bookData.map(b => { const x = xOffset + b.w / 2; xOffset += b.w + 0.01; return x; });
  const totalW = xOffset;

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[totalW / 2, H / 2, 0]}>
        <boxGeometry args={[totalW + 0.1, H, 0.32]} />
        <meshStandardMaterial color="#3d2510" roughness={0.75} />
      </mesh>
      {/* Shelves */}
      {[0.5, 1.1, 1.72, 2.35, 3.0, 3.65, 4.28].map((y, si) => (
        <mesh key={si} position={[totalW / 2, y, 0.18]}>
          <boxGeometry args={[totalW, 0.04, 0.3]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.7} />
        </mesh>
      ))}
      {/* Books across all shelves */}
      {bookData.slice(0, 16).map((book, i) => {
        const shelf = Math.floor(i / 4);
        const posInShelf = i % 4;
        const shelfY = [0.5, 1.1, 1.72, 2.35][shelf] + 0.04;
        return (
          <mesh key={`bk${i}`} ref={el => { meshRefs.current[i] = el; }} position={[-totalW / 2 + posInShelf * (totalW / 4) + 0.1, shelfY + book.h / 2, 0.16]}>
            <boxGeometry args={[book.w * 2.5, book.h, 0.24]} />
            <meshStandardMaterial color={book.color} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function WritingDesk() {
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (screenRef.current) {
      screenRef.current.emissiveIntensity = 0.55 + Math.sin(t.current * 2.5) * 0.1;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      {/* Desk */}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.08, 1.3]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.55} metalness={0.05} />
      </mesh>
      {[[-1.65, -0.55], [-1.65, 0.55], [1.65, -0.55], [1.65, 0.55]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.41, z]}>
          <boxGeometry args={[0.08, 0.82, 0.08]} />
          <meshStandardMaterial color="#3d2510" roughness={0.7} />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 1.3, -0.45]}>
        <boxGeometry args={[1.8, 0.1, 1.1]} />
        <meshStandardMaterial color="#1a0e04" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.3, -0.44]}>
        <planeGeometry args={[1.65, 0.92]} />
        <meshStandardMaterial ref={screenRef} color="#1a1000" emissive="#c8a050" emissiveIntensity={0.55} />
      </mesh>
      {/* Lamp */}
      <group position={[-1.4, 0.86, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.07, 0.04, 10]} />
          <meshStandardMaterial color="#8b6914" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.55, 8]} />
          <meshStandardMaterial color="#8b6914" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.14, 0.55, 0]} rotation={[0, 0, -0.4]}>
          <coneGeometry args={[0.17, 0.25, 14, 1, true]} />
          <meshStandardMaterial color="#f0d070" emissive="#f0d070" emissiveIntensity={0.5} side={2} />
        </mesh>
        <pointLight position={[0.2, 0.45, 0]} intensity={5} distance={3} color="#ffc877" />
      </group>
    </group>
  );
}

function ReadingChairs() {
  return (
    <group>
      {[-4.5, 4.5].map((x, i) => (
        <group key={i} position={[x, 0, 1.5]}>
          <mesh position={[0, 0.44, 0]} castShadow>
            <boxGeometry args={[0.8, 0.72, 0.8]} />
            <meshStandardMaterial color="#6b3a1f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.98, -0.36]} castShadow>
            <boxGeometry args={[0.8, 0.88, 0.1]} />
            <meshStandardMaterial color="#6b3a1f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.7, -0.05]}>
            <boxGeometry args={[0.55, 0.2, 0.55]} />
            <meshStandardMaterial color="#c8a050" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function ScribeOffice() {
  const [, navigate] = useLocation();
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a1004" }}>
      <Canvas shadows camera={{ position: [0, 2.8, 6], fov: 60, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} color="#ffc877" />
          <pointLight position={[0, H - 0.5, 0]} intensity={12} distance={14} color="#ffdd88" castShadow />
          <LibraryRoom />
          <Bookshelf position={[-W / 2 + 0.18, 0, 2]} rotation={[0, Math.PI / 2, 0]} />
          <Bookshelf position={[-W / 2 + 0.18, 0, -2.5]} rotation={[0, Math.PI / 2, 0]} />
          <Bookshelf position={[W / 2 - 0.18, 0, 2]} rotation={[0, -Math.PI / 2, 0]} />
          <WritingDesk />
          <ReadingChairs />
          <Text position={[0, H - 0.35, -D / 2 + 0.1]} fontSize={0.32} color="#fbbf24" anchorX="center" letterSpacing={0.2}>SCRIBE</Text>
          <Text position={[0, H - 0.75, -D / 2 + 0.1]} fontSize={0.13} color="#8b7040" anchorX="center">The Great Library · Quiet. Warm. Timeless.</Text>
          <OrbitControls target={[0, 1.5, -1]} minDistance={2} maxDistance={10} minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.07} />
        </Suspense>
      </Canvas>
      <div style={{ position: "fixed", top: 14, left: 20, zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/hallway/left")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "#fbbf24", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Wing A</button>
        <button onClick={() => navigate("/")} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(200,160,80,0.3)", background: "rgba(200,160,80,0.08)", color: "#c8a050", cursor: "pointer", fontSize: 12 }}>Lobby</button>
      </div>
      <div style={{ position: "fixed", top: 14, right: 20, zIndex: 20 }}>
        <div style={{ color: "#fbbf24", fontSize: 12, letterSpacing: "2px" }}>SCRIBE · The Great Library</div>
      </div>
    </div>
  );
}
