import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneSpeed } from "./SceneSpeed";

interface Props {
  intensity?: number;
  driftSpeed?: number;
  palette?: string[];
}

export default function AuroraVeil({
  intensity = 0.5,
  driftSpeed = 1,
  palette = ["#46c8b4", "#a078dc", "#dc5ab4"],
}: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const sceneSpeed = useSceneSpeed();

  const texture = useMemo(() => {
    const w = 1024, h = 256;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    palette.forEach((col, i) => {
      const stop = (i + 1) / (palette.length + 1);
      const rgb = new THREE.Color(col);
      grad.addColorStop(stop, `rgba(${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)},0.5)`);
    });
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, [palette.join("|")]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * driftSpeed * sceneSpeed;
    ref.current.rotation.z = Math.sin(t * 0.05) * 0.06;
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      intensity * (0.7 + Math.sin(t * 0.3) * 0.15);
  });

  return (
    <mesh ref={ref} position={[0, 18, -90]}>
      <planeGeometry args={[260, 60]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={intensity}
      />
    </mesh>
  );
}
