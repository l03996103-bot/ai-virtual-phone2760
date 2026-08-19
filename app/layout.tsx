import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { BootBackgroundRelease } from "@/components/boot-background-release";
import { ChatPluginBootstrap } from "@/components/chat-plugin-bootstrap";
import { ChatReasoningVisibilityController } from "@/components/chat-reasoning-visibility-controller";
import { CSSImportEnhancer } from "@/components/css-import-enhancer";
import { PWAManifestInjector } from "@/components/pwa-manifest-injector";
import { PWARegistrar } from "@/components/pwa-registrar";
import "../styles/fonts.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "67phone",
  description: "AI 虚拟互动手机",
};

// <html> 上的 booting 类让首帧就是黑的，盖住 PWA 冷启动时那两帧浅色
// （规则见 styles/base.css）；水合后由 BootBackgroundRelease 摘掉。
export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="booting">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        {/* iOS 从桌面启动 PWA 时，网页画出来之前先铺一张启动屏，底色取自这里。
            原值 #f8f7f2 近乎白色 —— 那就是冷启动时「白很久」的真身，而且和
            manifest 里的 theme_color: #000000 自相矛盾。统一成黑，和开屏星图接上。 */}
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="67phone" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <BootBackgroundRelease />
        <PWAManifestInjector />
        <PWARegistrar />
        <CSSImportEnhancer />
        <ChatPluginBootstrap />
        <ChatReasoningVisibilityController />
        {children}
      </body>
    </html>
  );
}
