/*
 * 撤掉冷启动的黑底兜底。
 *
 * 兜底由两层组成，都在 app/layout.tsx 的服务端输出里：
 *   1. <html> 上的内联 style 属性 —— 解析器读到开始标签就应用，浏览器拿它铺
 *      画布。这是唯一能在「首次绘制之前」生效的手段：那个阶段外部样式表还是
 *      渲染阻塞状态，任何 CSS 规则都还没参与，写在哪个文件里都救不了。
 *   2. booting 类 —— 配合 styles/base.css 里的规则压住 body 的浅色，
 *      管开屏播放的整个过程。
 *
 * 两层都要等开屏真正结束才撤。撤早了 body 恢复浅色，安全区和重绘间隙会漏白。
 */
export function releaseBootBackground(): void {
  const root = document.documentElement;
  root.classList.remove("booting");
  root.style.removeProperty("background-color");
}
