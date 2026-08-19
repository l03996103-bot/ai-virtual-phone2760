"use client";

import { useEffect } from "react";

/*
 * 兜底摘掉 <html> 上的 booting 类 —— 只负责那些不渲染开屏的路由。
 *
 * booting 让首帧就是黑的（规则见 styles/base.css）。开屏页在场时，什么时候
 * 该摘由 MainApp 说了算：它知道开屏几时真正结束，摘早了动画中途会漏白。
 *
 * 但 /verify、/app-market/admin 这些页面根本不渲染 MainApp，没人替它们摘，
 * 会一直顶着黑底。所以这里只做一件事：挂载时如果 DOM 里没有开屏层，
 * 说明当前路由不归 MainApp 管，立刻摘掉。
 */
export function BootBackgroundRelease() {
  useEffect(() => {
    if (document.querySelector(".splash-root")) return;
    document.documentElement.classList.remove("booting");
  }, []);

  return null;
}
