import Link from "next/link";
import { cn } from "@/lib/utils";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b bg-card/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-serif text-lg gold-gradient-text">
          {subtitle ?? "答谢宴抽奖系统"}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <HeaderLink href="/join">来宾参与</HeaderLink>
          <HeaderLink href="/admin">后台管理</HeaderLink>
          <HeaderLink href="/screen">抽奖大屏</HeaderLink>
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
