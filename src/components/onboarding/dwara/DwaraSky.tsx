import { useEffect, useRef } from "react";
import { SKY_DEFAULTS, type SkyController, type SkyTargets } from "./sky-state";

/**
 * The Dwara sky: a drifting starfield, a sacred-geometry mandala, and the
 * handful of things the flow can summon onto it (a sign wheel, a time-of-day
 * marker, an abstract Earth with a pin, a yantra, a gold bloom).
 *
 * One 2D canvas, no WebGL — the app already runs a three.js scene behind every
 * other route, and this has to be cheap on a mid-range Android. Three things
 * keep it that way: the background gradient lives in CSS (the canvas is only
 * ever cleared), stars are batched into four alpha buckets instead of one
 * stroke each, and the pixel ratio drops to 1 if frames start to run long.
 */

const TAU = Math.PI * 2;
const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Shortest signed distance between two angles. */
const angDelta = (to: number, from: number) => ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

interface Star {
  dx: number;
  dy: number;
  z: number;
  size: number;
  phase: number;
}

/** Two interlocking triangles, drawn one line at a time. */
const YANTRA_SEGMENTS = [[0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1]] as const;

const BUCKETS = 4;
const NUMERIC_KEYS = [
  "speed", "scale", "glow", "rings", "grahas", "signs", "signsAngle",
  "globe", "lines", "bloom", "spin", "cyFrac",
] as const satisfies readonly (keyof SkyTargets)[];

export default function DwaraSky({ sky }: { sky: SkyController }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceMq.matches;
    const onReduce = () => {
      reduce = reduceMq.matches;
      sky.dirty = true;
    };
    reduceMq.addEventListener("change", onReduce);

    const lowEnd =
      (navigator.hardwareConcurrency ?? 4) <= 2 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) <= 2;
    let dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    let needsResize = true;

    // Eased, drawn values. Numeric keys ease toward sky.targets each frame.
    const cur = { ...SKY_DEFAULTS, visibleH: 0 };
    let sunAmt = 0;
    let sunAngle = -Math.PI / 2;
    let pinAmt = 0;
    let pinLat = 0;
    let pinLng = 0;
    let viewLng = rad(20);
    let viewLat = rad(18);

    // Reused every frame — no per-frame allocation in the star loop.
    const dots: number[][] = Array.from({ length: BUCKETS }, () => []);
    const streaks: number[][] = Array.from({ length: BUCKETS }, () => []);

    const originY = () => H * 0.32;
    const spawn = (initial: boolean): Star => ({
      dx: (Math.random() * 2 - 1) * (W / 2),
      dy: Math.random() * H - originY(),
      z: initial ? 0.3 + Math.random() * 0.7 : 1,
      size: 0.7 + Math.random() * 1.1,
      phase: Math.random() * TAU,
    });

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      // Pinned to the layout viewport, not its parent: the stage shrinks with the
      // on-screen keyboard, and the canvas must not be squashed along with it.
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((W * H) / 2600, 140, 520) * (lowEnd ? 0.55 : 1));
      stars = Array.from({ length: n }, () => spawn(true));
      needsResize = false;
      sky.dirty = true;
    };
    const onResize = () => {
      if (window.innerWidth !== W || window.innerHeight !== H) needsResize = true;
    };
    window.addEventListener("resize", onResize);

    const poly = (cx: number, cy: number, r: number, n: number, rot: number) => {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = rot + (i / n) * TAU;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    };

    /** Orthographic projection of lat/lng onto the globe, view-centred. */
    const project = (lat: number, lng: number) => {
      const dl = lng - viewLng;
      const cosLat = Math.cos(lat);
      const x = cosLat * Math.sin(dl);
      const y = Math.cos(viewLat) * Math.sin(lat) - Math.sin(viewLat) * cosLat * Math.cos(dl);
      const depth = Math.sin(viewLat) * Math.sin(lat) + Math.cos(viewLat) * cosLat * Math.cos(dl);
      return { x, y, visible: depth > 0 };
    };

    let last = performance.now();
    let raf = 0;
    let phase = 0; // ring rotation, advanced by spin so a spin change never jumps
    let tt = 0; // plain time, for twinkle and orbits
    let avgDt = 16;
    let slowFrames = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dtRaw = now - last;
      last = now;
      const dt = Math.min(dtRaw, 50);

      if (needsResize) resize();
      const animate = !reduce;
      if (!animate && !sky.dirty) return;

      // ── adaptive quality ────────────────────────────────────────────────
      if (animate) {
        avgDt += (dt - avgDt) * 0.05;
        slowFrames = avgDt > 26 ? slowFrames + 1 : 0;
        if (slowFrames > 90 && dpr > 1) {
          dpr = 1;
          needsResize = true;
          slowFrames = 0;
        }
      }

      // ── ease toward the targets ─────────────────────────────────────────
      const T = sky.targets;
      const k = animate ? 1 - Math.exp(-dt / 380) : 1;
      for (const key of NUMERIC_KEYS) cur[key] += (T[key] - cur[key]) * k;
      const vhTarget = T.visibleH || H;
      cur.visibleH = cur.visibleH ? cur.visibleH + (vhTarget - cur.visibleH) * (animate ? 1 - Math.exp(-dt / 140) : 1) : vhTarget;

      sunAmt += ((T.sun === null ? 0 : 1) - sunAmt) * k;
      if (T.sun !== null) sunAngle += angDelta(T.sun, sunAngle) * k;

      const pinTarget = T.pin ? 1 : 0;
      if (T.pin) {
        pinLat = T.pin.lat;
        pinLng = T.pin.lng;
      }
      pinAmt += (pinTarget - pinAmt) * k;
      if (T.pin) {
        viewLng += angDelta(rad(pinLng), viewLng) * k;
        viewLat += (clamp(rad(pinLat) * 0.7, rad(-35), rad(45)) - viewLat) * k;
      } else {
        if (animate) viewLng += dt * 0.00018;
        viewLat += (rad(18) - viewLat) * k;
      }

      if (animate) {
        phase += dt * 0.001 * 0.18 * cur.spin;
        tt += dt * 0.001;
      }

      // ── geometry ────────────────────────────────────────────────────────
      const vh = cur.visibleH;
      const cx = W / 2;
      const cy = vh * cur.cyFrac;
      const R = Math.min(W, vh) * 0.46 * cur.scale;
      const glow = cur.glow;
      const globe = clamp(cur.globe, 0, 1);

      g.clearRect(0, 0, W, H);

      // ── stars ───────────────────────────────────────────────────────────
      const ox = W / 2;
      const oy = originY();
      const speedPerMs = animate ? cur.speed / 1000 : 0;
      const warp = cur.speed > 0.6;
      for (let b = 0; b < BUCKETS; b++) {
        dots[b].length = 0;
        streaks[b].length = 0;
      }
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const prevZ = s.z;
        s.z -= speedPerMs * dt;
        const px = ox + s.dx / s.z;
        const py = oy + s.dy / s.z;
        if (s.z < 0.08 || px < -30 || px > W + 30 || py < -30 || py > H + 30) {
          stars[i] = spawn(false);
          continue;
        }
        const fade = Math.min(1, (1 - s.z) * 5 + (animate ? 0 : 1));
        const twinkle = animate ? 0.7 + 0.3 * Math.sin(tt * 1.3 + s.phase) : 1;
        const a = fade * twinkle;
        if (a < 0.04) continue;
        const bucket = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
        if (warp) {
          // A streak back along the path the star just travelled.
          const trail = Math.max(prevZ, s.z + speedPerMs * dt * 4);
          streaks[bucket].push(ox + s.dx / trail, oy + s.dy / trail, px, py, Math.max(0.6, (1 - s.z) * 2.2));
        } else {
          dots[bucket].push(px, py, s.size * (1 + (1 - s.z) * 0.8));
        }
      }
      for (let b = 0; b < BUCKETS; b++) {
        const alpha = (b + 1) / BUCKETS;
        const d = dots[b];
        if (d.length) {
          g.fillStyle = `rgba(255,236,204,${alpha * 0.85})`;
          for (let i = 0; i < d.length; i += 3) g.fillRect(d[i], d[i + 1], d[i + 2], d[i + 2]);
        }
        const sk = streaks[b];
        if (sk.length) {
          g.strokeStyle = `rgba(255,226,170,${alpha})`;
          g.lineWidth = 1.4;
          g.beginPath();
          for (let i = 0; i < sk.length; i += 5) {
            g.moveTo(sk[i], sk[i + 1]);
            g.lineTo(sk[i + 2], sk[i + 3]);
          }
          g.stroke();
        }
      }

      // ── core glow ───────────────────────────────────────────────────────
      {
        const r = R * 1.25;
        const gl = g.createRadialGradient(cx, cy, R * 0.05, cx, cy, r);
        gl.addColorStop(0, `rgba(255,240,200,${clamp(0.55 * glow + 0.1, 0, 1)})`);
        gl.addColorStop(0.35, `rgba(245,185,66,${clamp(0.25 * glow, 0, 1)})`);
        gl.addColorStop(1, "rgba(245,185,66,0)");
        g.fillStyle = gl;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // ── sacred rings ────────────────────────────────────────────────────
      g.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const vis = clamp(cur.rings * 7 - i, 0, 1);
        if (vis < 0.01) continue;
        const r = R * (0.22 + i * 0.13);
        const dir = i % 2 ? -1 : 1;
        const a = (0.75 - i * 0.07) * (0.4 + glow * 0.6) * vis * (1 - 0.65 * globe);
        g.strokeStyle = `rgba(255,${200 + i * 6},120,${clamp(a, 0, 1)})`;
        poly(cx, cy, r, i % 3 === 0 ? 12 : i % 3 === 1 ? 8 : 6, phase * dir + i);
        if (i % 2 === 0) {
          g.strokeStyle = `rgba(255,${200 + i * 6},120,${clamp(a * 0.4, 0, 1)})`;
          g.beginPath();
          g.arc(cx, cy, r, 0, TAU);
          g.stroke();
        }
      }

      // ── sign wheel (appears with the birth date) ────────────────────────
      if (cur.signs > 0.01) {
        const rs = R * 1.1;
        const a = clamp(cur.signs, 0, 1);
        g.strokeStyle = `rgba(255,226,160,${0.22 * a})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, rs, 0, TAU);
        g.stroke();
        g.strokeStyle = `rgba(255,226,160,${0.7 * a})`;
        g.beginPath();
        for (let n = 0; n < 12; n++) {
          const ang = cur.signsAngle + (n * TAU) / 12 - Math.PI / 2;
          const long = n % 3 === 0;
          const r0 = rs * 0.965;
          const r1 = rs * (long ? 1.07 : 1.035);
          g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
          g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        }
        g.stroke();
      }

      // ── yantra: two triangles drawn line by line ────────────────────────
      if (cur.lines > 0.01) {
        const rl = R * 0.62;
        const pts: [number, number][] = [];
        for (let n = 0; n < 6; n++) {
          const ang = phase * 2.2 + (n * TAU) / 6 - Math.PI / 2;
          pts.push([cx + Math.cos(ang) * rl, cy + Math.sin(ang) * rl]);
        }
        const progress = clamp(cur.lines, 0, 1) * YANTRA_SEGMENTS.length;
        g.strokeStyle = `rgba(255,228,160,${0.35 + 0.35 * cur.lines})`;
        g.lineWidth = 1.2;
        g.beginPath();
        for (let seg = 0; seg < YANTRA_SEGMENTS.length; seg++) {
          const p = clamp(progress - seg, 0, 1);
          if (p <= 0) break;
          const a = pts[YANTRA_SEGMENTS[seg][0]];
          const bpt = pts[YANTRA_SEGMENTS[seg][1]];
          g.moveTo(a[0], a[1]);
          g.lineTo(a[0] + (bpt[0] - a[0]) * p, a[1] + (bpt[1] - a[1]) * p);
        }
        g.stroke();
        g.fillStyle = `rgba(255,240,200,${0.8 * clamp(cur.lines, 0, 1)})`;
        for (const [x, y] of pts) {
          g.beginPath();
          g.arc(x, y, 2.4, 0, TAU);
          g.fill();
        }
      }

      // ── centre: a quiet core, or the globe once a place is being chosen ──
      g.strokeStyle = `rgba(255,235,180,${clamp((0.5 + glow * 0.4) * (1 - globe), 0, 1)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, R * 0.19, 0, TAU);
      g.stroke();
      g.fillStyle = `rgba(255,244,214,${0.75 * (1 - globe)})`;
      g.beginPath();
      g.arc(cx, cy, 2.6, 0, TAU);
      g.fill();

      if (globe > 0.01) {
        const rg = R * 0.5 * (0.6 + 0.4 * globe);
        const body = g.createRadialGradient(cx - rg * 0.3, cy - rg * 0.35, rg * 0.1, cx, cy, rg);
        body.addColorStop(0, `rgba(48,36,84,${0.95 * globe})`);
        body.addColorStop(1, `rgba(8,8,22,${0.96 * globe})`);
        g.fillStyle = body;
        g.beginPath();
        g.arc(cx, cy, rg, 0, TAU);
        g.fill();

        // Graticule — meridians and parallels, broken wherever they turn away.
        g.strokeStyle = `rgba(255,226,160,${0.3 * globe})`;
        g.lineWidth = 0.8;
        g.beginPath();
        const trace = (pts: { lat: number; lng: number }[]) => {
          let pen = false;
          for (const p of pts) {
            const q = project(p.lat, p.lng);
            if (!q.visible) {
              pen = false;
              continue;
            }
            const sx = cx + q.x * rg;
            const sy = cy - q.y * rg;
            if (pen) g.lineTo(sx, sy);
            else g.moveTo(sx, sy);
            pen = true;
          }
        };
        for (let lng = -180; lng < 180; lng += 30) {
          const line = [];
          for (let lat = -90; lat <= 90; lat += 6) line.push({ lat: rad(lat), lng: rad(lng) });
          trace(line);
        }
        for (let lat = -60; lat <= 60; lat += 30) {
          const line = [];
          for (let lng = -180; lng <= 180; lng += 6) line.push({ lat: rad(lat), lng: rad(lng) });
          trace(line);
        }
        g.stroke();

        g.strokeStyle = `rgba(255,226,160,${0.7 * globe})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx, cy, rg, 0, TAU);
        g.stroke();

        if (pinAmt > 0.01) {
          const q = project(rad(pinLat), rad(pinLng));
          if (q.visible) {
            const sx = cx + q.x * rg;
            const sy = cy - q.y * rg;
            const a = pinAmt * globe;
            const halo = g.createRadialGradient(sx, sy, 0, sx, sy, 22);
            halo.addColorStop(0, `rgba(255,236,170,${0.85 * a})`);
            halo.addColorStop(1, "rgba(255,200,80,0)");
            g.fillStyle = halo;
            g.fillRect(sx - 22, sy - 22, 44, 44);
            if (animate) {
              const p = (tt * 0.9) % 1;
              g.strokeStyle = `rgba(255,226,150,${(1 - p) * 0.7 * a})`;
              g.lineWidth = 1.2;
              g.beginPath();
              g.arc(sx, sy, 4 + p * 16, 0, TAU);
              g.stroke();
            }
            g.fillStyle = `rgba(255,248,224,${a})`;
            g.beginPath();
            g.arc(sx, sy, 3.6, 0, TAU);
            g.fill();
          }
        }
      }

      // ── the nine grahas ─────────────────────────────────────────────────
      if (cur.grahas > 0.01) {
        const count = clamp(cur.grahas, 0, 1) * 9;
        for (let i = 0; i < 9; i++) {
          const lit = clamp(count - i, 0, 1);
          if (lit <= 0) continue;
          const ang = tt * (0.25 + i * 0.04) + i * 0.7;
          const r = R * (0.35 + i * 0.075);
          const a = lit * (0.5 + 0.5 * Math.sin(tt * 2 + i)) * (1 - 0.7 * globe);
          g.fillStyle = `rgba(255,226,150,${clamp(a, 0, 1)})`;
          g.beginPath();
          g.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2.2 + (i % 3), 0, TAU);
          g.fill();
        }
      }

      // ── time-of-day marker on the sign wheel ────────────────────────────
      if (sunAmt > 0.01) {
        const rs = R * 1.1;
        const sx = cx + Math.cos(sunAngle) * rs;
        const sy = cy + Math.sin(sunAngle) * rs;
        g.strokeStyle = `rgba(255,226,160,${0.28 * sunAmt})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cx + Math.cos(sunAngle) * R * 0.22, cy + Math.sin(sunAngle) * R * 0.22);
        g.lineTo(sx, sy);
        g.stroke();
        const halo = g.createRadialGradient(sx, sy, 0, sx, sy, 16);
        halo.addColorStop(0, `rgba(255,240,190,${0.9 * sunAmt})`);
        halo.addColorStop(1, "rgba(255,200,80,0)");
        g.fillStyle = halo;
        g.fillRect(sx - 16, sy - 16, 32, 32);
        g.fillStyle = `rgba(255,250,232,${sunAmt})`;
        g.beginPath();
        g.arc(sx, sy, 4.5, 0, TAU);
        g.fill();
      }

      // ── pulse: a beat confirmed ─────────────────────────────────────────
      if (animate) {
        const age = now - sky.pulseAt;
        if (age >= 0 && age < 1700) {
          const p = age / 1700;
          const a = Math.pow(1 - p, 1.6) * sky.pulseStrength * 0.9;
          g.strokeStyle = `rgba(255,232,170,${clamp(a, 0, 1)})`;
          g.lineWidth = 1 + (1 - p) * 2.5;
          g.beginPath();
          g.arc(cx, cy, R * (0.2 + p * 1.6), 0, TAU);
          g.stroke();
        }
      }

      // ── bloom: gold light flooding the screen ───────────────────────────
      if (cur.bloom > 0.003) {
        const b = clamp(cur.bloom, 0, 1);
        const rb = Math.max(W, H) * 0.95;
        const L = g.createRadialGradient(cx, cy, 0, cx, cy, rb);
        L.addColorStop(0, `rgba(255,250,232,${b})`);
        L.addColorStop(0.55, `rgba(255,226,160,${b * 0.96})`);
        L.addColorStop(1, `rgba(245,185,66,${b * 0.9})`);
        g.fillStyle = L;
        g.fillRect(0, 0, W, H);
      }

      sky.dirty = false;
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      reduceMq.removeEventListener("change", onReduce);
    };
  }, [sky]);

  return <canvas ref={ref} aria-hidden className="dw-canvas" />;
}
