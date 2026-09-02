import { useMemo } from "react";
import * as THREE from "three";
import type { ConstellationSet } from "@/lib/appearance-defaults";

interface Props {
  opacity?: number;
  color?: string;
  sets?: ConstellationSet[];
  viewportXY?: number;
}

const DATA: Record<ConstellationSet, [number, number, number][]> = {
  bigDipper:  [[-22, 9, -60], [-19, 11, -60], [-15, 10, -60], [-12, 8, -60], [-9, 9, -60], [-6, 12, -60], [-3, 11, -60]],
  orion:      [[10, -3, -55], [13, -3, -55], [16, -3, -55]],
  triangle:   [[18, 6, -65], [22, 9, -65], [20, 4, -65], [18, 6, -65]],
  cassiopeia: [[-25, -8, -70], [-22, -5, -70], [-19, -8, -70], [-16, -5, -70], [-13, -8, -70]],
};

export default function ConstellationLines({
  opacity = 0.4,
  color = "#C9A84C",
  sets = ["bigDipper", "orion", "cassiopeia", "triangle"],
  viewportXY = 1,
}: Props) {
  const groups = useMemo(() => {
    return sets.map((key) => {
      const points = DATA[key] ?? [];
      const verts = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        verts[i * 3] = p[0] * viewportXY; verts[i * 3 + 1] = p[1] * viewportXY; verts[i * 3 + 2] = p[2];
      });
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      return geom;
    });
  }, [sets.join("|"), viewportXY]);

  return (
    <group>
      {groups.map((g, i) => (
        <line key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}
    </group>
  );
}
