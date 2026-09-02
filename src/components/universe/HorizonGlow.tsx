import { useMemo } from "react";
import * as THREE from "three";

/**
 * Subtle teal/green aurora band at the bottom of the scene.
 * Rendered as a wide stretched sprite with additive blending.
 */
export default function HorizonGlow() {
  const texture = useMemo(() => {
    const w = 512;
    const h = 128;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(40,180,160,0)");
    grad.addColorStop(0.55, "rgba(60,200,170,0.35)");
    grad.addColorStop(0.85, "rgba(80,220,190,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <sprite position={[0, -38, -120]} scale={[400, 60, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
