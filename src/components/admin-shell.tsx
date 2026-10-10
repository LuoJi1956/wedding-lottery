"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "活动配置" },
  { href: "/admin/prizes", label: "奖项设置" },
  { href: "/admin/participants", label: "参与名单" },
  { href: "/admin/winners", label: "中奖名单" },
  { href: "/admin/qrcode", label: "参与二维码" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await api.logout();
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="font-serif gold-gradient-text">答谢宴抽奖系统</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">后台管理</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/screen" target="_blank">
                打开大屏
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={loggingOut} onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {loggingOut ? "退出中…" : "退出"}
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "touch-target inline-flex shrink-0 items-center rounded-lg px-3 text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
