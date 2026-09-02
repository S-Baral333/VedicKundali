import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props { intensity?: number; viewportXY?: number; viewportPushZ?: number }

/**
 * Subtle radial god-ray sprite high in the scene, gently breathing.
 */
export default function GodRays({ intensity = 0.3, viewportXY = 1, viewportPushZ = 0 }: Props) {
  const ref = useRef<THREE.Sprite>(null);

  const texture = useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,235,180,0.85)");
    grad.addColorStop(0.4, "rgba(255,200,140,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    (ref.current.material as THREE.SpriteMaterial).opacity =
      intensity * (0.7 + Math.sin(t * 0.4) * 0.25);
  });

  return (
    <sprite ref={ref} position={[15 * viewportXY, 25 * viewportXY, -100 + viewportPushZ]} scale={[80, 80, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={intensity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
