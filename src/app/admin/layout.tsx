export const metadata = { title: "后台管理 · 答谢宴抽奖系统" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
