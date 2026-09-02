import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";
import { useSceneSpeed } from "./SceneSpeed";

interface Props {
  count: number;
  speedMul?: number;
  color?: string;
}

/**
 * Cool-tinted close-distance dust. Imperative geometry built once.
 */
export default function CosmicDust({ count, speedMul = 1, color = "#a8b8d8" }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const sceneSpeed = useSceneSpeed();

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = -Math.random() * 30 - 5;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      sizeAttenuation: true,
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: getStarTexture(),
      alphaTest: 0.01,
    });

    return { geometry: geom, material: mat };
  }, [count, color]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const eff = speedMul * sceneSpeed;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += delta * 4 * eff;
      arr[i * 3] += delta * 0.2 * eff;
      if (arr[i * 3 + 2] > 5) {
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 2] = -35;
      }
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

