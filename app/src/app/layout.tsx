import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "蒼理塾", template: "%s | 蒼理塾" },
  description: "蒼理塾 学習管理アプリ — 会話は Discord、状態はアプリ。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
