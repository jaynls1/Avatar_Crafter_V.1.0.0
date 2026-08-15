import { useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { ColladaLoader } from "three-stdlib";
import * as THREE from "three";

/**
 * 3D Nova — MakeHuman COLLADA model uploaded by the user.
 * Auto-scales to a target height and drops her feet onto the floor.
 */
export default function Nova3D({
  position = [0, 0, 0] as [number, number, number],
  rotationY = 0,
  targetHeight = 1.9,
}: {
  position?: [number, number, number];
  rotationY?: number;
  targetHeight?: number;
}) {
  const collada = useLoader(
    ColladaLoader,
    `${import.meta.env.BASE_URL}models/nova/nova.dae`
  );
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    // The MakeHuman rig's skeleton doesn't resolve in ColladaLoader
    // ("Unable to find root bone"), so we bake every SkinnedMesh into a
    // plain static Mesh in its bind pose. We never animate the rig, and
    // this avoids the matrixWorld crash inside Box3.setFromObject.
    const source = collada.scene;
    const group = new THREE.Group();

    source.updateMatrixWorld(true);
    source.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const src = obj as THREE.Mesh;
        const staticMesh = new THREE.Mesh(src.geometry, src.material);
        staticMesh.applyMatrix4(src.matrixWorld);
        staticMesh.castShadow = true;
        const mats = Array.isArray(staticMesh.material) ? staticMesh.material : [staticMesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshPhongMaterial;
          mat.side = THREE.DoubleSide;
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          // Eyelashes/hair need alpha handling
          if (mat.transparent) {
            mat.alphaTest = 0.35;
            mat.depthWrite = true;
          }
        });
        group.add(staticMesh);
      }
    });

    // Auto-scale to target height and rest feet at y=0, computed from
    // geometry bounds (safe for plain meshes).
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    group.scale.setScalar(scale);

    const box2 = new THREE.Box3().setFromObject(group);
    group.position.y -= box2.min.y;

    return group;
  }, [collada, targetHeight]);

  // Subtle idle sway so she feels alive
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y =
        rotationY + Math.sin(clock.elapsedTime * 0.5) * 0.04;
      groupRef.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.008;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={model} />
      {/* Soft key light so her face reads well */}
      <pointLight position={[0.8, 2.2, 1.5]} intensity={2.5} distance={6} color="#fff2dd" />
    </group>
  );
}
