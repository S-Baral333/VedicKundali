import { useEffect, useRef } from "react";

/* ─── Color Palette ─── */
const COLORS = [
  { r: 240, g: 238, b: 232 }, // cool white  70%
  { r: 255, g: 217, b: 122 }, // warm gold   15%
  { r: 200, g: 222, b: 255 }, // blue-white  10%
  { r: 255, g: 176, b: 136 }, // red-orange   5%
];
function pickColor(): { r: number; g: number; b: number } {
  const r = Math.random();
  if (r < 0.7) return COLORS[0];
  if (r < 0.85) return COLORS[1];
  if (r < 0.95) return COLORS[2];
  return COLORS[3];
}

/* ─── Star ─── */
interface Star {
  x: number; y: number; baseR: number;
  r: number; g: number; b: number;
  phase: number; speed: number; baseAlpha: number;
  driftX: number; driftY: number;
  brightness: number; // baseR * baseAlpha — for ranking
}
function createStar(): Star {
  // weighted toward small
  const sizeRoll = Math.random();
  const baseR = sizeRoll < 0.6 ? 0.3 + Math.random() * 0.5
    : sizeRoll < 0.85 ? 0.8 + Math.random() * 0.7
    : 1.5 + Math.random() * 1.0;
  const baseAlpha = Math.min(0.25 + baseR * 0.3, 0.9);
  const c = pickColor();
  return {
    x: Math.random(), y: Math.random(), baseR,
    ...c,
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 1.2,
    baseAlpha,
    driftX: (Math.random() - 0.5) * 0.000004,
    driftY: (Math.random() - 0.5) * 0.000002,
    brightness: baseR * baseAlpha,
  };
}

/* ─── Shooting Star ─── */
interface ShootingStar {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  tailLen: number;
  nextSpawn: number; // ms until spawn
}
function initShootingStar(): ShootingStar {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, tailLen: 0, nextSpawn: 15000 + Math.random() * 15000 };
}
function spawnShootingStar(s: ShootingStar, w: number, h: number) {
  const angle = (160 + Math.random() * 40) * Math.PI / 180;
  const speed = 400 + Math.random() * 600; // px/s
  s.x = Math.random() * w * 0.8 + w * 0.1;
  s.y = Math.random() * h * 0.3;
  s.vx = Math.cos(angle) * speed;
  s.vy = Math.sin(angle) * speed;
  s.maxLife = 0.4 + Math.random() * 0.8;
  s.life = 0;
  s.tailLen = 60 + Math.random() * 100;
  s.active = true;
}

/* ─── Sparkle Residue ─── */
interface Sparkle {
  active: boolean;
  x: number; y: number;
  life: number; maxLife: number;
  baseR: number;
}
const SPARKLE_POOL_SIZE = 96;

/* ─── Satellite ─── */
interface Satellite {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  nextSpawn: number;
}
function initSatellite(): Satellite {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, nextSpawn: 25000 + Math.random() * 35000 };
}
function spawnSatellite(s: Satellite, w: number, h: number) {
  const edge = Math.floor(Math.random() * 4);
  const duration = 12 + Math.random() * 8; // seconds
  let sx: number, sy: number, ex: number, ey: number;
  if (edge === 0) { sx = Math.random() * w; sy = -5; ex = Math.random() * w; ey = h + 5; }
  else if (edge === 1) { sx = Math.random() * w; sy = h + 5; ex = Math.random() * w; ey = -5; }
  else if (edge === 2) { sx = -5; sy = Math.random() * h; ex = w + 5; ey = Math.random() * h; }
  else { sx = w + 5; sy = Math.random() * h; ex = -5; ey = Math.random() * h; }
  s.x = sx; s.y = sy;
  s.vx = (ex - sx) / duration;
  s.vy = (ey - sy) / duration;
  s.maxLife = duration;
  s.life = 0;
  s.active = true;
}

/* ─── Nebula Patch ─── */
interface Nebula { x: number; y: number; rx: number; ry: number; r: number; g: number; b: number; alpha: number; }
function createNebulae(count: number): Nebula[] {
  const out: Nebula[] = [];
  for (let i = 0; i < count; i++) {
    const isPurple = Math.random() > 0.4;
    out.push({
      x: Math.random(), y: Math.random(),
      rx: 0.1 + Math.random() * 0.15, ry: 0.08 + Math.random() * 0.12,
      r: isPurple ? 80 + Math.random() * 40 : 40 + Math.random() * 30,
      g: isPurple ? 40 + Math.random() * 30 : 50 + Math.random() * 40,
      b: isPurple ? 140 + Math.random() * 60 : 160 + Math.random() * 60,
      alpha: 0.025 + Math.random() * 0.025,
    });
  }
  return out;
}

/* ─── Component ─── */
const STAR_COUNT = 650;

export default function LiveNightSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastTime = 0;

    // --- Pools ---
    const stars: Star[] = Array.from({ length: STAR_COUNT }, createStar);
    // find top 3 brightest
    const sorted = [...stars].sort((a, b) => b.brightness - a.brightness);
    const brightestIndices = new Set(sorted.slice(0, 3).map(s => stars.indexOf(s)));

    const shootingStars: ShootingStar[] = [initShootingStar(), initShootingStar(), initShootingStar(), initShootingStar()];
    const sparkles: Sparkle[] = Array.from({ length: SPARKLE_POOL_SIZE }, () => ({
      active: false, x: 0, y: 0, life: 0, maxLife: 0.8, baseR: 0,
    }));
    let sparkleIdx = 0;
    const satellites: Satellite[] = [initSatellite(), initSatellite(), initSatellite()];
    const nebulae = createNebulae(4);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    function emitSparkle(x: number, y: number) {
      const s = sparkles[sparkleIdx % SPARKLE_POOL_SIZE];
      s.active = true;
      s.x = x + (Math.random() - 0.5) * 6;
      s.y = y + (Math.random() - 0.5) * 6;
      s.life = 0;
      s.maxLife = 0.6 + Math.random() * 0.4;
      s.baseR = 0.8 + Math.random() * 1.2;
      sparkleIdx++;
    }

    const draw = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.1); // cap at 100ms
      lastTime = time;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // --- Atmospheric: nebulae ---
      for (const n of nebulae) {
        const grad = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, Math.max(n.rx * w, n.ry * h));
        grad.addColorStop(0, `rgba(${n.r},${n.g},${n.b},${n.alpha})`);
        grad.addColorStop(1, `rgba(${n.r},${n.g},${n.b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // --- Horizon glow ---
      const hGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
      hGrad.addColorStop(0, "rgba(40,30,80,0)");
      hGrad.addColorStop(1, "rgba(40,30,80,0.12)");
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, h * 0.85, w, h * 0.15);

      // --- Stars ---
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // drift
        s.x += s.driftX * dt;
        s.y += s.driftY * dt;
        if (s.x < -0.02) s.x = 1.02;
        if (s.x > 1.02) s.x = -0.02;
        if (s.y < -0.02) s.y = 1.02;
        if (s.y > 1.02) s.y = -0.02;

        const alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 * s.speed + s.phase));
        const px = s.x * w;
        const py = s.y * h;

        ctx.beginPath();
        ctx.arc(px, py, s.baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`;
        ctx.fill();

        // Lens flare on brightest 3
        if (brightestIndices.has(i) && alpha > 0.3) {
          const flareLen = s.baseR * 8;
          const fa = alpha * 0.35;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${fa})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(px - flareLen, py); ctx.lineTo(px + flareLen, py);
          ctx.moveTo(px, py - flareLen); ctx.lineTo(px, py + flareLen);
          ctx.stroke();
        }
      }

      // --- Shooting stars ---
      let activeCount = 0;
      for (const s of shootingStars) {
        if (s.active) {
          activeCount++;
          s.life += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          if (s.life >= s.maxLife || s.x < -100 || s.x > w + 100 || s.y > h + 100) {
            s.active = false;
            s.nextSpawn = 15000 + Math.random() * 15000;
            continue;
          }

          const progress = s.life / s.maxLife;
          const headAlpha = 1 - progress * 0.5;
          const angle = Math.atan2(s.vy, s.vx);
          const tailX = s.x - Math.cos(angle) * s.tailLen;
          const tailY = s.y - Math.sin(angle) * s.tailLen;

          const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255,255,255,${headAlpha})`);
          grad.addColorStop(0.3, `rgba(255,217,122,${headAlpha * 0.6})`);
          grad.addColorStop(1, `rgba(255,217,122,0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          // head glow
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${headAlpha})`;
          ctx.fill();

          // emit sparkle residue
          if (Math.random() < 0.6) emitSparkle(s.x, s.y);
        } else {
          s.nextSpawn -= dt * 1000;
          if (s.nextSpawn <= 0 && activeCount < 2) {
            spawnShootingStar(s, w, h);
            activeCount++;
          }
        }
      }

      // --- Sparkle residue ---
      for (const sp of sparkles) {
        if (!sp.active) continue;
        sp.life += dt;
        if (sp.life >= sp.maxLife) { sp.active = false; continue; }
        const t = sp.life / sp.maxLife;
        const a = (1 - t) * 0.7;
        const r = sp.baseR * (1 - t * 0.6);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,230,170,${a})`;
        ctx.fill();
      }

      // --- Satellites ---
      for (const s of satellites) {
        if (s.active) {
          s.life += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.life >= s.maxLife) {
            s.active = false;
            s.nextSpawn = 25000 + Math.random() * 35000;
            continue;
          }
          // dot
          ctx.beginPath();
          ctx.arc(s.x, s.y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(220,220,230,0.85)";
          ctx.fill();
          // tiny tail
          const angle = Math.atan2(s.vy, s.vx);
          const tx = s.x - Math.cos(angle) * 4;
          const ty = s.y - Math.sin(angle) * 4;
          ctx.strokeStyle = "rgba(220,220,230,0.25)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        } else {
          s.nextSpawn -= dt * 1000;
          if (s.nextSpawn <= 0) spawnSatellite(s, w, h);
        }
      }

      // --- Vignette ---
      const vGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      vGrad.addColorStop(0, "rgba(0,0,0,0)");
      vGrad.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}
