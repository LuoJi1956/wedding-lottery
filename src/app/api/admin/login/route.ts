import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isHttps,
  sessionCookieOptions,
  sessionCookieValue,
  verifyPassword,
} from "@/lib/server/admin-auth";
import { fail, parseBody } from "@/lib/server/http";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if ("response" in parsed) return parsed.response;

  if (!process.env.ADMIN_PASSWORD) {
    return fail("服务端未配置 ADMIN_PASSWORD，无法登录后台", 500);
  }
  if (!verifyPassword(parsed.data.password)) {
    return fail("口令不正确", 401);
  }

  const response = NextResponse.json({ ok: true, data: {} });
  response.cookies.set(
    ADMIN_COOKIE,
    sessionCookieValue(),
    sessionCookieOptions(isHttps(request)),
  );
  return response;
}
