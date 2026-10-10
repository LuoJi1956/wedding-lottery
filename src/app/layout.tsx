import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "答谢宴抽奖系统",
  description: "婚礼现场抽奖：来宾扫码参与、后台配置、大屏开奖",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 不锁死缩放：长辈可以用双指放大看清姓名与编号
  viewportFit: "cover",
  themeColor: "#b08a3e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
