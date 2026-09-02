import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";
import { useSceneSpeed } from "./SceneSpeed";

interface StarFieldProps {
  count: number;
  spread: number;
  size: number;
  speed: number;
  colorPalette?: string[];
  twinkle?: boolean;
  sizeVariance?: boolean;
  speedMul?: number;
  tintColor?: string;
  spreadMul?: number;
}

export default function StarField({
  count,
  spread,
  size,
  speed,
  colorPalette = ["#ffffff", "#dce8ff", "#fff4e0"],
  twinkle = true,
  sizeVariance = true,
  speedMul = 1,
  tintColor,
  spreadMul = 1,
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const sceneSpeed = useSceneSpeed();

  const palette = useMemo(
    () => (tintColor ? [tintColor] : colorPalette),
    // intentionally string-stable
    [tintColor, colorPalette.join("|")]
  );

  const effSpread = spread * spreadMul;

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorObjs = palette.map((c) => new THREE.Color(c));

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * effSpread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * effSpread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * effSpread;

      const c = colorObjs[Math.floor(Math.random() * colorObjs.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      const r = Math.random();
      sizes[i] = sizeVariance
        ? r > 0.97 ? 1.6 + Math.random() * 0.6
        : r > 0.85 ? 0.9 + Math.random() * 0.4
        : 0.3 + Math.random() * 0.4
        : 1;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: getStarTexture(),
      alphaTest: 0.01,
    });

    return { geometry: geom, material: mat };
  }, [count, effSpread, size, palette, sizeVariance]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const halfSpread = effSpread / 2;
    const eff = speed * speedMul * sceneSpeed;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += eff * delta * 60;
      if (arr[i * 3 + 2] > halfSpread) {
        arr[i * 3] = (Math.random() - 0.5) * effSpread;
        arr[i * 3 + 1] = (Math.random() - 0.5) * effSpread;
        arr[i * 3 + 2] = -halfSpread;
      }
    }
    posAttr.needsUpdate = true;

    if (twinkle) {
      const t = state.clock.elapsedTime;
      material.opacity = 0.78 + Math.sin(t * 0.8 * sceneSpeed) * 0.12;
    } else {
      material.opacity = 0.9;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
