import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Keep just ambient dust — the furniture IS the props now
function AmbientDust({ count = 40 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.sin(i * 2.4) * 0.5 + 0.5) * 24 - 12;
      arr[i * 3 + 1] = (Math.sin(i * 3.7) * 0.5 + 0.5) * 6;
      arr[i * 3 + 2] = -(Math.sin(i * 1.9) * 0.5 + 0.5) * 12 + 1;
    }
    return arr;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.004;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color="#F97316" transparent opacity={0.14} sizeAttenuation />
    </points>
  );
}

export function FloatingProps() {
  return (
    <group>
      <AmbientDust count={40} />
    </group>
  );
}
