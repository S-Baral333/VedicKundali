import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";
import { useSceneSpeed } from "./SceneSpeed";

interface Props {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  scale?: number;
  armCount?: number;
  rotationSpeed?: number;
  freePos?: { x: number; y: number; z: number };
  /** Multiplier for x/y offsets (smaller on mobile so layer stays in frustum). */
  viewportXY?: number;
  /** Additional z push (negative pushes farther) for narrow viewports. */
  viewportPushZ?: number;
}

export default function SpiralGalaxy({
  position = "top-right",
  scale = 1,
  armCount = 4,
  rotationSpeed = 1,
  freePos,
  viewportXY = 1,
  viewportPushZ = 0,
}: Props) {
  const ref = useRef<THREE.Points>(null);
  const sceneSpeed = useSceneSpeed();

  const offset = useMemo<[number, number, number]>(() => {
    const raw: [number, number, number] = freePos
      ? [freePos.x, freePos.y, freePos.z]
      : (() => {
          switch (position) {
            case "top-left":     return [-30, 18, -80];
            case "top-right":    return [30, 18, -80];
            case "bottom-left":  return [-30, -18, -80];
            case "bottom-right": return [30, -18, -80];
            default:             return [0, 0, -80];
          }
        })();
    return [raw[0] * viewportXY, raw[1] * viewportXY, raw[2] + viewportPushZ];
  }, [position, freePos?.x, freePos?.y, freePos?.z, viewportXY, viewportPushZ]);

  const { geometry, material } = useMemo(() => {
    const arms = Math.max(2, Math.min(6, armCount));
    const armSeparation = (Math.PI * 2) / arms;
    const armOffsetMax = 0.6;
    const rotationFactor = 4;
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#fff0d8"),
      new THREE.Color("#dce8ff"),
      new THREE.Color("#f4b8b8"),
      new THREE.Color("#c89bd8"),
    ];

    for (let i = 0; i < count; i++) {
      const distance = Math.pow(Math.random(), 2);
      const arm = Math.floor(Math.random() * arms);
      const armOffset = (Math.random() - 0.5) * armOffsetMax * (1 - distance);
      const angle = arm * armSeparation + distance * rotationFactor + armOffset;
      const r = distance * 12 * scale;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6 * scale;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      const c = distance < 0.25 ? palette[1] : palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.45,
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
  }, [scale, armCount]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02 * rotationSpeed * sceneSpeed;
  });

  return <points ref={ref} geometry={geometry} material={material} position={offset} />;
}
