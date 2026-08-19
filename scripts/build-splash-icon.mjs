/*
 * 从开屏星图生成 PWA 图标(icon-192.png / icon-512.png)。
 *
 * 画的是 components/splash-animation.tsx 里那幅星图"落定后的最后一帧":
 * 同一套伪随机种子、同一组轨道参数,所以图标和开屏动画是同一幅图。
 *
 * 手动运行,不挂在 npm run build 上:
 *     node scripts/build-splash-icon.mjs
 *
 * 改了 splash-animation.tsx 里的 ORBITS 或点数之后,把改动同步到下面的
 * 常量再跑一次,图标就跟着更新。
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ── 与 splash-animation.tsx 保持一致的参数 ── */
const VB = 240;
const C = VB / 2;

const ORBITS = [
  { rx: 112, ry: 46, rot: -20, ox: 3, oy: -4, n: 160, op: 0.5, rmin: 0.18, rvar: 0.16 },
  { rx: 102, ry: 40, rot: -36, ox: -6, oy: 3, n: 150, op: 0.4, rmin: 0.18, rvar: 0.15 },
  { rx: 96, ry: 36, rot: -52, ox: 3, oy: 4, n: 230, op: 1.0, rmin: 0.3, rvar: 0.26 },
  { rx: 91, ry: 31, rot: -47, ox: 1, oy: 2, n: 215, op: 0.9, rmin: 0.28, rvar: 0.24 },
  { rx: 84, ry: 27, rot: -70, ox: -2, oy: -2, n: 160, op: 0.62, rmin: 0.22, rvar: 0.18 },
  { rx: 88, ry: 33, rot: 10, ox: 6, oy: 1, n: 150, op: 0.36, rmin: 0.18, rvar: 0.15 },
  { rx: 60, ry: 24, rot: -32, ox: -3, oy: 3, n: 140, op: 0.58, rmin: 0.22, rvar: 0.18 },
];

/*
 * 屏幕上那幅图靠的是"很多极细的点 + 抗锯齿"堆出灰度,单颗点直径不到
 * 半个 CSS 像素。缩到 192px 的图标里这些点会直接消失,所以这里把半径
 * 整体放大,并给一个下限 —— 图标要的是能看清的密度,不是原尺寸的忠实复刻。
 */
/* 视觉尺寸补偿:尺寸越小,点要相对越粗才读得出来。192 那版按 512 的粗细
   渲出来,放到桌面上就是一块发灰的黑。 */
const R_SCALE_BY_SIZE = { 192: 2.45, 512: 1.75 };
const R_MIN = 0.26;

/* 渲染分辨率:先画大再降采样,细点的密度才留得住 */
const SUPERSAMPLE = 1024;

function buildDots(rScale) {
  let seed = 0;
  const rand = () => {
    seed += 1;
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const pointOn = (o, t) => {
    const r = (o.rot * Math.PI) / 180;
    const x = o.rx * Math.cos(t);
    const y = o.ry * Math.sin(t);
    return {
      x: C + o.ox + x * Math.cos(r) - y * Math.sin(r),
      y: C + o.oy + x * Math.sin(r) + y * Math.cos(r),
    };
  };

  /* 图标只要落点,不需要起点/螺旋采样点,但 rand() 的调用次数必须和
     组件里的 makeDot 完全一致,否则后面所有点的伪随机序列都会错位。 */
  const out = [];
  const push = (x, y, r, o) => {
    rand(); rand(); /* 对应 makeDot 里的 dx / dy 抖动 */
    rand();         /* 对应 sw */
    out.push({ x, y, r: Math.max(r * rScale, R_MIN), o });
  };

  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const t = rand() ** 2.4;
    const d = t * 21;
    const delayRand = 0.1 + t * 3.0 + rand() * 0.35; void delayRand;
    const pushRand = 26 + rand() * 40; void pushRand;
    push(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.86, 0.26 + (1 - t) * 0.58, 0.42 + (1 - t) * 0.58);
  }

  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2;
    const d = 18 + rand() ** 0.7 * 22;
    const r = 0.18 + rand() * 0.24;
    const o = 0.12 + rand() * 0.28;
    const delayRand = 0.9 + rand() * 2.7; void delayRand;
    const pushRand = 24 + rand() * 40; void pushRand;
    push(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.86, r, o);
  }

  for (const o of ORBITS) {
    for (let i = 0; i < o.n; i++) {
      const base = (i / o.n) * Math.PI * 2;
      const p = pointOn(o, base + (rand() - 0.5) * (5 / o.n));
      const dense = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(base * 2 + o.rot));
      const r = (o.rmin + rand() * o.rvar) * (0.78 + dense * 0.34);
      const delayRand = rand(); void delayRand;
      const pushRand = 44 + rand() * 78; void pushRand;
      push(p.x, p.y, r, o.op * dense);
    }
  }

  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const d = 66 + rand() * 54;
    const r = 0.22 + rand() * 0.3;
    const o = 0.18 + rand() * 0.4;
    const delayRand = 1.2 + rand() * 3.0; void delayRand;
    const pushRand = 30 + rand() * 46; void pushRand;
    push(C + Math.cos(a) * d * 1.12, C + Math.sin(a) * d * 0.82, r, o);
  }

  return out;
}

function buildSvg(dots) {
  const circles = dots
    .map((d) => `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${d.r.toFixed(3)}" fill="#f4f4f5" fill-opacity="${d.o.toFixed(3)}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SUPERSAMPLE}" height="${SUPERSAMPLE}" viewBox="0 0 ${VB} ${VB}"><rect width="${VB}" height="${VB}" fill="#000000"/>${circles}</svg>`;
}

for (const [size, rScale] of Object.entries(R_SCALE_BY_SIZE)) {
  const dots = buildDots(rScale);
  const svg = buildSvg(dots);
  const out = path.join(ROOT, "public", `icon-${size}.png`);
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(Number(size), Number(size), { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`[splash-icon] wrote public/icon-${size}.png  (${dots.length} dots, r×${rScale})`);
}

/* 矢量源按 512 的粗细存一份,以后要导别的尺寸有个起点 */
await writeFile(
  path.join(ROOT, "public", "icon-source.svg"),
  buildSvg(buildDots(R_SCALE_BY_SIZE[512])),
  "utf8",
);
console.log("[splash-icon] wrote public/icon-source.svg (矢量源)");
