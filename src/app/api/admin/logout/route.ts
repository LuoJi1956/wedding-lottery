import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isHttps, sessionCookieOptions } from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true, data: {} });
  // 用 delete() 会漏掉 Secure 标记，https 下删不掉安全 Cookie，所以按登录时同样的属性覆盖
  response.cookies.set(ADMIN_COOKIE, "", {
    ...sessionCookieOptions(isHttps(request)),
    maxAge: 0,
  });
  return response;
}
