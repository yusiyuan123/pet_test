import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Betting System",
  description: "Demo betting system with Next.js + Prisma + SQLite"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
