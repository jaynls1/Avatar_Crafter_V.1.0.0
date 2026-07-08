const ROOM_W = 16;
const ROOM_H = 5;
const ROOM_D = 12;

function WoodFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D, 16, 12]} />
      <meshStandardMaterial color="#5c3d1e" roughness={0.8} metalness={0.05} />
    </mesh>
  );
}

function FloorPlanks() {
  const planks = [];
  for (let i = -ROOM_D / 2 + 0.75; i < ROOM_D / 2; i += 1.5) {
    planks.push(
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, i]} receiveShadow>
        <planeGeometry args={[ROOM_W, 0.02]} />
        <meshStandardMaterial color="#3d2510" roughness={0.9} />
      </mesh>
    );
  }
  return <>{planks}</>;
}

function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial color="#e8e4de" roughness={0.95} />
    </mesh>
  );
}

function WallBack() {
  return (
    <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_H]} />
      <meshStandardMaterial color="#d6cec2" roughness={0.9} />
    </mesh>
  );
}

function WallLeft() {
  return (
    <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_W / 2, ROOM_H / 2, 0]} receiveShadow>
      <planeGeometry args={[ROOM_D, ROOM_H]} />
      <meshStandardMaterial color="#ccc5b8" roughness={0.9} />
    </mesh>
  );
}

function WallRight() {
  return (
    <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_W / 2, ROOM_H / 2, 0]} receiveShadow>
      <planeGeometry args={[ROOM_D, ROOM_H]} />
      <meshStandardMaterial color="#ccc5b8" roughness={0.9} />
    </mesh>
  );
}

function Baseboard() {
  return (
    <>
      <mesh position={[0, 0.05, -ROOM_D / 2 + 0.03]}>
        <boxGeometry args={[ROOM_W, 0.12, 0.04]} />
        <meshStandardMaterial color="#8b7355" roughness={0.7} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_W / 2 + 0.03, 0.05, 0]}>
        <boxGeometry args={[ROOM_D, 0.12, 0.04]} />
        <meshStandardMaterial color="#8b7355" roughness={0.7} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_W / 2 - 0.03, 0.05, 0]}>
        <boxGeometry args={[ROOM_D, 0.12, 0.04]} />
        <meshStandardMaterial color="#8b7355" roughness={0.7} />
      </mesh>
    </>
  );
}

function CeilingLights() {
  const positions = [
    [-4, 0, -3], [4, 0, -3],
    [-4, 0, 3], [4, 0, 3],
  ] as [number, number, number][];

  return (
    <>
      {positions.map(([x, , z], i) => (
        <group key={i} position={[x, ROOM_H - 0.01, z]}>
          <mesh>
            <boxGeometry args={[1.2, 0.05, 0.4]} />
            <meshStandardMaterial color="#f0ead8" emissive="#fffaed" emissiveIntensity={1.2} />
          </mesh>
          <pointLight
            position={[0, -0.1, 0]}
            intensity={18}
            distance={8}
            color="#fff5e0"
            castShadow={false}
          />
        </group>
      ))}
    </>
  );
}

export const ROOM_DIMS = { w: ROOM_W, h: ROOM_H, d: ROOM_D };

export default function Room() {
  return (
    <group>
      <WoodFloor />
      <FloorPlanks />
      <Ceiling />
      <WallBack />
      <WallLeft />
      <WallRight />
      <Baseboard />
      <CeilingLights />
      <ambientLight intensity={0.6} color="#fff5e0" />
      <directionalLight
        position={[3, 8, 3]}
        intensity={0.8}
        color="#ffe8c0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </group>
  );
}
