import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneSpeed } from "./SceneSpeed";

interface ShootingStar {
  start: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface Props {
  frequency?: "rare" | "occasional" | "frequent";
  color?: string;
}

const FREQ: Record<NonNullable<Props["frequency"]>, { spawnMin: number; spawnMax: number; max: number }> = {
  rare:       { spawnMin: 8, spawnMax: 18, max: 2 },
  occasional: { spawnMin: 3, spawnMax: 7,  max: 4 },
  frequent:   { spawnMin: 1, spawnMax: 3,  max: 6 },
};

export default function ShootingStars({ frequency = "rare", color = "#fff0c8" }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const nextSpawnRef = useRef(2);
  const cfg = FREQ[frequency];
  const sceneSpeed = useSceneSpeed();

  const stars = useMemo<ShootingStar[]>(
    () =>
      Array.from({ length: cfg.max }, () => ({
        start: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      })),
    [cfg.max]
  );

  const lines = useMemo(() => {
    const colorHex = new THREE.Color(color).getHex();
    return Array.from({ length: cfg.max }, () => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      line.visible = false;
      return line;
    });
  }, [cfg.max, color]);

  // Replace children if pool size changed
  useEffect(() => {
    if (!groupRef.current) return;
    while (groupRef.current.children.length) groupRef.current.remove(groupRef.current.children[0]);
    lines.forEach((l) => groupRef.current!.add(l));
  }, [lines]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (t > nextSpawnRef.current) {
      const free = stars.find((s) => !s.active);
      if (free) {
        free.start.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 30 + 10,
          -20 - Math.random() * 20
        );
        free.velocity
          .set(-0.6 - Math.random() * 0.4, -0.4 - Math.random() * 0.3, 0.2)
          .normalize()
          .multiplyScalar(40);
        free.life = 0;
        free.maxLife = 1.2 + Math.random() * 0.6;
        free.active = true;
        const span = cfg.spawnMax - cfg.spawnMin;
        nextSpawnRef.current = t + (cfg.spawnMin + Math.random() * span) / Math.max(0.25, sceneSpeed);
      }
    }

    stars.forEach((s, i) => {
      const line = lines[i];
      if (!s.active) {
        line.visible = false;
        return;
      }
      s.life += delta * sceneSpeed;
      if (s.life >= s.maxLife) {
        s.active = false;
        line.visible = false;
        return;
      }
      line.visible = true;
      const head = s.start.clone().add(s.velocity.clone().multiplyScalar(s.life));
      const tail = s.start.clone().add(s.velocity.clone().multiplyScalar(Math.max(0, s.life - 0.15)));
      const arr = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      arr[0] = tail.x; arr[1] = tail.y; arr[2] = tail.z;
      arr[3] = head.x; arr[4] = head.y; arr[5] = head.z;
      (line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      const fade = 1 - s.life / s.maxLife;
      (line.material as THREE.LineBasicMaterial).opacity = fade;
    });
  });

  return <group ref={groupRef} />;
}
