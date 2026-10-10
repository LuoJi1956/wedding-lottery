import Link from "next/link";
import { MonitorPlay, QrCode, Settings } from "lucide-react";
import { Header } from "@/components/header";

const entries = [
  {
    href: "/join",
    icon: QrCode,
    title: "来宾参与",
    desc: "手机扫码填写姓名，生成抽奖券",
  },
  {
    href: "/admin",
    icon: Settings,
    title: "后台管理",
    desc: "活动配置、奖项、名单、二维码",
  },
  {
    href: "/screen",
    icon: MonitorPlay,
    title: "抽奖大屏",
    desc: "1920×1080 投影开奖动画",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-4xl flex-col justify-center gap-8 px-5 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm tracking-[0.3em] text-gold-deep">WEDDING LOTTERY</p>
          <h1 className="text-4xl gold-gradient-text sm:text-5xl">答谢宴抽奖系统</h1>
          <p className="text-muted-foreground">
            来宾扫码参与 · 大屏服务端开奖 · 后台配置活动与奖项
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {entries.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:border-gold hover:shadow-lg"
            >
              <Icon className="h-7 w-7 text-gold transition-colors group-hover:text-gold-deep" />
              <h2 className="mt-4 font-serif text-lg">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
