"use client";

import { useEffect } from "react";

/*
 * 摘掉 <html> 上的 booting 类。
 *
 * 那个类只负责一件事：在 React 接手之前把首帧铺成黑的（规则见 styles/base.css）。
 * 水合完成时开屏层已经自己画好了黑底，兜底就该退场 —— 留着的话进桌面后 body
 * 会一直是黑的，宽屏下手机壳周围那圈浅色页面背景就没了。
 *
 * 挂在根布局里而不是 MainApp 里：/verify、/app-market/admin 这些页面不渲染
 * MainApp，兜底类得有人替它们摘掉，否则那几页会一直顶着黑底。
 */
export function BootBackgroundRelease() {
  useEffect(() => {
    document.documentElement.classList.remove("booting");
  }, []);

  return null;
}
