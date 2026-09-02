import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";

interface Props { intensity?: number }

/**
 * Out-of-focus foreground particles that drift gently — depth-of-field bokeh.
 */
export default function ForegroundBokeh({ intensity = 0.4 }: Props) {
  const ref = useRef<THREE.Points>(null);
  const count = 40;

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = 1 + Math.random() * 2;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: true,
      color: "#fff0d0",
      transparent: true,
      opacity: intensity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: getStarTexture(),
      alphaTest: 0.01,
    });
    return { geometry: geom, material: mat };
  }, [intensity]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const arr = (geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.15;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -7;
    }
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}
