import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getStarTexture } from "./starTexture";
import { archPoint } from "./NebulaLayer";

interface Props {
  count?: number;
}

/**
 * Dense star cluster sampled along the Milky Way arch with Gaussian
 * thickness — gives the visible "river of stars" core band.
 */
export default function MilkyWayBand({ count = 1500 }: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#dce8ff"),
      new THREE.Color("#fff0d8"),
      new THREE.Color("#f4b8b8"),
      new THREE.Color("#c89bd8"),
    ];

    // Box-Muller for Gaussian thickness
    const gaussian = () => {
      let u = 0,
        v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const [bx, by, bz] = archPoint(t);
      // Gaussian thickness perpendicular to arch
      const thickX = gaussian() * 8;
      const thickY = gaussian() * 12;
      const thickZ = gaussian() * 15;

      positions[i * 3] = bx + thickX;
      positions[i * 3 + 1] = by + thickY;
      positions[i * 3 + 2] = bz + thickZ;

      // Color tinted toward warm core in middle of arch
      const coreness = 1 - Math.abs(t - 0.5) * 2;
      const c =
        coreness > 0.6 && Math.random() > 0.5
          ? palette[3 + Math.floor(Math.random() * 2)]
          : palette[Math.floor(Math.random() * 3)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.8,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: getStarTexture(),
      alphaTest: 0.01,
    });

    return { geometry: geom, material: mat };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.z = Math.sin(t * 0.015) * 0.008;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
