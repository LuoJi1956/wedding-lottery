import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { fail } from "@/lib/server/http";

export const ADMIN_COOKIE = "wedding_lottery_admin";
const SESSION_TTL_SECONDS = 30 * 24 * 3600;

function hash(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** 口令未配置时一律拒绝登录，避免误把后台开放到公网 */
export function verifyPassword(input: string): boolean {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  const a = hash(input);
  const b = hash(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookieValue(): string {
  return createHash("sha256").update(process.env.ADMIN_PASSWORD ?? "").digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function isAdmin(): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return cookies().get(ADMIN_COOKIE)?.value === sessionCookieValue();
}

/** 写接口统一调用：未登录直接拿到 401 响应，省掉每个路由重复判断 */
export function requireAdmin(): Response | null {
  return isAdmin() ? null : fail("登录状态已失效，请重新输入后台口令", 401);
}
