import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SacredPattern } from "@/lib/appearance-defaults";
import { useSceneSpeed } from "./SceneSpeed";

interface Props {
  opacity?: number;
  pattern?: SacredPattern;
  rotationSpeed?: number;
  color?: string;
  viewportPushZ?: number;
}

function drawFlowerOfLife(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2, cy = s / 2, r = s * 0.16;
  const offsets = [
    [0, 0], [r, 0], [-r, 0],
    [r / 2, r * 0.866], [-r / 2, r * 0.866],
    [r / 2, -r * 0.866], [-r / 2, -r * 0.866],
  ];
  offsets.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSriYantra(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2, cy = s / 2, R = s * 0.32;
  // Outer circle
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // 9 interlocking triangles (4 up, 5 down at varying scales)
  const tri = (size: number, up: boolean) => {
    ctx.beginPath();
    if (up) {
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx - size * 0.866, cy + size / 2);
      ctx.lineTo(cx + size * 0.866, cy + size / 2);
    } else {
      ctx.moveTo(cx, cy + size);
      ctx.lineTo(cx - size * 0.866, cy - size / 2);
      ctx.lineTo(cx + size * 0.866, cy - size / 2);
    }
    ctx.closePath(); ctx.stroke();
  };
  [R * 0.95, R * 0.75, R * 0.55, R * 0.35].forEach((sz) => tri(sz, true));
  [R * 0.85, R * 0.65, R * 0.45, R * 0.3, R * 0.18].forEach((sz) => tri(sz, false));
}

function drawMetatron(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2, cy = s / 2, r = s * 0.12;
  const points: [number, number][] = [[cx, cy]];
  for (let ring = 1; ring <= 2; ring++) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      points.push([cx + Math.cos(a) * r * 2 * ring, cy + Math.sin(a) * r * 2 * ring]);
    }
  }
  // Connect every point to every other
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      ctx.beginPath();
      ctx.moveTo(points[i][0], points[i][1]);
      ctx.lineTo(points[j][0], points[j][1]);
      ctx.stroke();
    }
  }
  points.forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.stroke();
  });
}

function drawMerkaba(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2, cy = s / 2, R = s * 0.32;
  const tri = (up: boolean) => {
    ctx.beginPath();
    if (up) {
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx - R * 0.866, cy + R / 2);
      ctx.lineTo(cx + R * 0.866, cy + R / 2);
    } else {
      ctx.moveTo(cx, cy + R);
      ctx.lineTo(cx - R * 0.866, cy - R / 2);
      ctx.lineTo(cx + R * 0.866, cy - R / 2);
    }
    ctx.closePath(); ctx.stroke();
  };
  tri(true); tri(false);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
}

export default function SacredGeometryWatermark({
  opacity = 0.15,
  pattern = "flowerOfLife",
  rotationSpeed = 1,
  color = "#C9A84C",
  viewportPushZ = 0,
}: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const sceneSpeed = useSceneSpeed();

  const texture = useMemo(() => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d")!;
    const rgb = new THREE.Color(color);
    ctx.strokeStyle = `rgba(${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)},0.85)`;
    ctx.lineWidth = 1.2;
    switch (pattern) {
      case "sriYantra": drawSriYantra(ctx, s); break;
      case "metatron":  drawMetatron(ctx, s); break;
      case "merkaba":   drawMerkaba(ctx, s); break;
      default:          drawFlowerOfLife(ctx, s);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, [pattern, color]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.01 * rotationSpeed * sceneSpeed;
  });

  return (
    <mesh ref={ref} position={[0, 0, -110 + viewportPushZ]}>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
