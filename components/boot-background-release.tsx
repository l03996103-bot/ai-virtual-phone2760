"use client";

import { useEffect } from "react";

import { releaseBootBackground } from "@/lib/boot-background";

/*
 * 只负责那些不渲染开屏的路由（/verify、/app-market/admin 等）。
 *
 * 开屏页在场时，什么时候撤兜底由 MainApp 说了算 —— 它知道开屏几时真正结束，
 * 撤早了动画中途会漏白。但那些页面根本不渲染 MainApp，没人替它们撤，
 * 会一直顶着黑底，所以这里补一刀：挂载时 DOM 里没有开屏层就立刻撤。
 */
export function BootBackgroundRelease() {
  useEffect(() => {
    if (document.querySelector(".splash-root")) return;
    releaseBootBackground();
  }, []);

  return null;
}
