import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";

interface Props { count?: number; color?: string; viewportXY?: number; viewportPushZ?: number }

export default function PulsarBeacons({ count = 3, color = "#fff5d0", viewportXY = 1, viewportPushZ = 0 }: Props) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, material, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phs: number[] = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60 * viewportXY;
      positions[i * 3 + 1] = ((Math.random() - 0.5) * 30 + 5) * viewportXY;
      positions[i * 3 + 2] = -40 - Math.random() * 30 + viewportPushZ;
      phs.push(Math.random() * Math.PI * 2);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: true,
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: getStarTexture(),
      alphaTest: 0.01,
    });
    return { geometry: geom, material: mat, phases: phs };
  }, [count, color, viewportXY, viewportPushZ]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const avg = phases.reduce((a, p) => a + Math.abs(Math.sin(t * 1.2 + p)), 0) / phases.length;
    (ref.current.material as THREE.PointsMaterial).opacity = 0.55 + avg * 0.45;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}
