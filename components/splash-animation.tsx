"use client";

import { useMemo, type CSSProperties } from "react";

/*
 * 开屏动画 —— 点刻风星图。
 *
 * 参考点刻(dotwork)纹身:线不是连续的描边,而是一颗颗墨点排出来的。
 * 近千颗墨点从画面外侧螺旋飘拢,聚成核与七条星轨,最后浮出 67phone 字标。
 *
 * 移植自 mono-phone 的 BootScreen.vue(Vue 3 → React 19)。原版是盖住整屏的
 * 定时幕布,自带幕布层和 documentElement 兜底类;这里星图只负责画,退场由
 * MainApp 统一管:动画放完(SPLASH_DURATION_MS)且数据就绪后自动进桌面,
 * 中途点一下可以提前跳过。
 *
 * 性能上靠"错峰"而不是"少画":每颗点的动画都带 both 填充,延迟未到之前它
 * 停在 opacity:0 的起始态 —— 静止、不产生重绘。延迟摊在 7.4 秒里,任一时刻
 * 真正在动的约 260 颗,一千五百多颗点因此也铺得动。
 */

/*
 * 整段动画的时长。最后一颗点在 8.21s 落定,字标 7.2s 开始展开、1.5s 走完,
 * 留到 8.7s 让整幅图完整地看一眼。MainApp 拿这个值决定什么时候自动进桌面,
 * 所以改动画节奏时这个数要跟着改。
 */
export const SPLASH_DURATION_MS = 8700;

const VB = 240; /* viewBox 尺寸,中心 120,120 */
const C = VB / 2;

type Orbit = {
  rx: number;
  ry: number;
  rot: number;
  ox: number;
  oy: number;
  n: number;
  delay: number;
  dur: number;
  op: number;
  rmin: number;
  rvar: number;
};

/*
 * 对着点刻纹身参考调出来的一组:
 *  - 椭圆开一些(约 2.4:1),太细会把整幅图收成一条窄带
 *  - 圆心各自错开几个单位 —— 全部同心会显得像标准件
 *  - 两条重墨只差 5° 挨在一起,是参考图最醒目的特征:两端聚拢、中段分开
 *  - 一条向另一侧倾,把扇面拉开
 */
const ORBITS: Orbit[] = [
  { rx: 112, ry: 46, rot: -20, ox: 3, oy: -4, n: 160, delay: 0.40, dur: 3.0, op: 0.5, rmin: 0.18, rvar: 0.16 },
  { rx: 102, ry: 40, rot: -36, ox: -6, oy: 3, n: 150, delay: 1.08, dur: 3.0, op: 0.4, rmin: 0.18, rvar: 0.15 },
  { rx: 96, ry: 36, rot: -52, ox: 3, oy: 4, n: 230, delay: 1.76, dur: 3.0, op: 1.0, rmin: 0.3, rvar: 0.26 },
  { rx: 91, ry: 31, rot: -47, ox: 1, oy: 2, n: 215, delay: 2.44, dur: 3.0, op: 0.9, rmin: 0.28, rvar: 0.24 },
  { rx: 84, ry: 27, rot: -70, ox: -2, oy: -2, n: 160, delay: 3.12, dur: 3.0, op: 0.62, rmin: 0.22, rvar: 0.18 },
  { rx: 88, ry: 33, rot: 10, ox: 6, oy: 1, n: 150, delay: 3.80, dur: 3.0, op: 0.36, rmin: 0.18, rvar: 0.15 },
  { rx: 60, ry: 24, rot: -32, ox: -3, oy: 3, n: 140, delay: 4.40, dur: 3.0, op: 0.58, rmin: 0.22, rvar: 0.18 },
];

/* 一颗点:落点 (x,y)、半径 r、亮度 o、入场延迟 d、
   起点偏移 (dx,dy)、螺旋路径上的两个中途采样点 (m1,m2) */
type Dot = {
  x: number;
  y: number;
  r: number;
  o: number;
  d: number;
  dx: number;
  dy: number;
  m1x: number;
  m1y: number;
  m2x: number;
  m2y: number;
};

function buildDots(): Dot[] {
  /* 定死的伪随机 —— 每次开机的点位必须一模一样,不能真随机。
     seed 收在函数内,StrictMode 下重跑一次结果也完全一致。 */
  let seed = 0;
  const rand = () => {
    seed += 1;
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  const pointOn = (o: Orbit, t: number) => {
    const r = (o.rot * Math.PI) / 180;
    const x = o.rx * Math.cos(t);
    const y = o.ry * Math.sin(t);
    return {
      x: C + o.ox + x * Math.cos(r) - y * Math.sin(r),
      y: C + o.oy + x * Math.sin(r) + y * Math.cos(r),
    };
  };

  const makeDot = (
    x: number,
    y: number,
    r: number,
    o: number,
    delay: number,
    push: number,
    spread: number,
  ): Dot => {
    const vx = x - C;
    const vy = y - C;
    const len = Math.hypot(vx, vy) || 1;
    /* 起点沿"由中心指向落点"的方向再往外抛一段,并加一点横向偏移,
       于是是从外围各个方向飘拢过来,而不是整齐地放大 */
    const dx = (vx / len) * push + (rand() - 0.5) * spread;
    const dy = (vy / len) * push + (rand() - 0.5) * spread;

    /*
     * 两个关键帧之间 transform 是直线插值,所以曲线得靠中间帧采样出来。
     * 这里按真正的螺旋取样:半径随进度线性收到 0,角度同时旋过 sw。
     * 取两个中间点(38% / 70%)而不是一个 —— 一个点只能折出一道钝角,
     * 速度在那里会明显一顿;两个点才拟合得出平滑的弧。
     */
    const sw = 0.55 + rand() * 0.4;
    const spiral = (p: number): [number, number] => {
      const a = sw * p;
      const k = 1 - p;
      return [
        (dx * Math.cos(a) - dy * Math.sin(a)) * k,
        (dx * Math.sin(a) + dy * Math.cos(a)) * k,
      ];
    };
    const [m1x, m1y] = spiral(0.38);
    const [m2x, m2y] = spiral(0.7);
    return { x, y, r, o, d: delay, dx, dy, m1x, m1y, m2x, m2y };
  };

  const out: Dot[] = [];

  /* 中心的核:幂次分布把点往里压,越靠内越密越大。
     入场摊在 2.5 秒里而不是挤在一起 —— SVG 元素的动画走主线程,
     同时在动的越少越稳,而这段正好和 app 挂载撞在一起。 */
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const t = rand() ** 2.4;
    const d = t * 21;
    out.push(makeDot(
      C + Math.cos(a) * d,
      C + Math.sin(a) * d * 0.86,
      0.26 + (1 - t) * 0.58,
      0.42 + (1 - t) * 0.58,
      0.1 + t * 3.0 + rand() * 0.35,
      26 + rand() * 40,
      22,
    ));
  }

  /* 核外一圈稀薄的晕 —— 让它有个化开的边缘,而不是一刀切的硬边 */
  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2;
    const d = 18 + rand() ** 0.7 * 22;
    out.push(makeDot(
      C + Math.cos(a) * d,
      C + Math.sin(a) * d * 0.86,
      0.18 + rand() * 0.24,
      0.12 + rand() * 0.28,
      0.9 + rand() * 2.7,
      24 + rand() * 40,
      24,
    ));
  }

  /* 七条轨道,每条错开 .55s 依次开始。同一条上的点按角度顺序到位,于是是
     "绕着描出来"的。沿线的疏密做正弦起伏 —— 参考图里墨色不是均匀的,
     有几段明显更浓。 */
  for (const o of ORBITS) {
    for (let i = 0; i < o.n; i++) {
      const base = (i / o.n) * Math.PI * 2;
      /* 抖动按点距缩放:点越密抖动要越小,否则密的线会糊成一条带 */
      const p = pointOn(o, base + (rand() - 0.5) * (5 / o.n));
      /* 墨色沿线起伏,浓的地方点也更粗 —— 才像笔压变化,而不是均匀的灰 */
      const dense = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(base * 2 + o.rot));
      out.push(makeDot(
        p.x,
        p.y,
        (o.rmin + rand() * o.rvar) * (0.78 + dense * 0.34),
        o.op * dense,
        o.delay + (i / o.n) * o.dur + rand() * 0.14,
        44 + rand() * 78,
        30,
      ));
    }
  }

  /* 散落在外的几点碎屑 */
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const d = 66 + rand() * 54;
    out.push(makeDot(
      C + Math.cos(a) * d * 1.12,
      C + Math.sin(a) * d * 0.82,
      0.22 + rand() * 0.3,
      0.18 + rand() * 0.4,
      1.2 + rand() * 3.0,
      30 + rand() * 46,
      26,
    ));
  }

  return out;
}

export function SplashAnimation() {
  const dots = useMemo(buildDots, []);

  return (
    <div className="splash-animation-stage" aria-hidden>
      <div className="splash-dot-stage">
        {/* 每颗点从外侧飘进来落到位;核先聚拢,七条轨道随后依次绕着铺开 */}
        <svg className="splash-dot-chart" viewBox={`0 0 ${VB} ${VB}`}>
          {dots.map((p, i) => (
            <circle
              key={i}
              className="splash-dot"
              cx={p.x}
              cy={p.y}
              r={p.r}
              style={{
                "--o": p.o.toFixed(2),
                "--dx": `${p.dx.toFixed(2)}px`,
                "--dy": `${p.dy.toFixed(2)}px`,
                "--m1x": `${p.m1x.toFixed(2)}px`,
                "--m1y": `${p.m1y.toFixed(2)}px`,
                "--m2x": `${p.m2x.toFixed(2)}px`,
                "--m2y": `${p.m2y.toFixed(2)}px`,
                "--delay": `${p.d.toFixed(2)}s`,
              } as CSSProperties}
            />
          ))}
        </svg>

        <div className="splash-wordmark"><b><i>67</i>phone</b></div>
      </div>
    </div>
  );
}
