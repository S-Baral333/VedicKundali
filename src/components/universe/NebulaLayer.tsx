import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";

interface Blob {
  t: number; // 0..1 along the arch
  scale: number;
  color: string;
  opacity: number;
}

// Soft glowing cores along the Milky Way arch — purple → pink → warm gold
const BLOBS: Blob[] = [
  { t: 0.05, scale: 90, color: "#3a1f5e", opacity: 0.32 },
  { t: 0.22, scale: 110, color: "#5e2a6e", opacity: 0.38 },
  { t: 0.42, scale: 140, color: "#a44a7a", opacity: 0.42 },
  { t: 0.58, scale: 150, color: "#c46a5a", opacity: 0.4 },
  { t: 0.78, scale: 110, color: "#7e3a6e", opacity: 0.34 },
  { t: 0.95, scale: 80, color: "#2a1f5a", opacity: 0.28 },
];

/**
 * Sample a point on the Milky Way arch (sweeping across upper sky).
 * Returns world-space position.
 */
function archPoint(t: number, jitterY = 0): [number, number, number] {
  const x = -120 + t * 240; // sweep from -120 to +120
  const y = 30 + Math.sin(t * Math.PI) * 18 + jitterY; // arch up over the top
  const z = -180 + Math.sin(t * Math.PI) * 30; // closer in the middle
  return [x, y, z];
}

export { archPoint };

/**
 * Glowing nebula spine sprites along the galactic arch.
 */
export default function NebulaLayer() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => getStarTexture(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.02) * 0.01;
  });

  return (
    <group ref={groupRef}>
      {BLOBS.map((blob, i) => {
        const pos = archPoint(blob.t);
        return (
          <sprite key={i} position={pos} scale={[blob.scale, blob.scale * 0.7, 1]}>
            <spriteMaterial
              map={texture}
              color={blob.color}
              transparent
              opacity={blob.opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        );
      })}
    </group>
  );
}
