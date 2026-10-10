import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { isAdmin } from "@/lib/server/admin-auth";

/** 会话写在 httpOnly Cookie 里，未登录直接跳到口令页，不给看后台 DOM */
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}
