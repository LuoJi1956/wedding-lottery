import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE,
  isHttps,
  sessionCookieOptions,
  sessionCookieValue,
  verifyPassword,
} from "@/lib/server/admin-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("后台口令校验", () => {
  it("口令完全一致才通过", () => {
    vi.stubEnv("ADMIN_PASSWORD", "wedding");
    expect(verifyPassword("wedding")).toBe(true);
    expect(verifyPassword("Wedding")).toBe(false);
    expect(verifyPassword("wedding ")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });

  it("未配置 ADMIN_PASSWORD 时任何口令都被拒绝", () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(verifyPassword("")).toBe(false);
    expect(verifyPassword("anything")).toBe(false);
  });

  it("口令相近但不同不会产生哈希碰撞", () => {
    vi.stubEnv("ADMIN_PASSWORD", "1234567890");
    expect(verifyPassword("1234567891")).toBe(false);
    expect(verifyPassword("1234567890")).toBe(true);
  });
});

describe("会话 Cookie", () => {
  it("会话值由口令派生，改口令后旧 Cookie 立刻失效", () => {
    vi.stubEnv("ADMIN_PASSWORD", "old-pass");
    const oldCookie = sessionCookieValue();
    vi.stubEnv("ADMIN_PASSWORD", "new-pass");
    expect(sessionCookieValue()).not.toBe(oldCookie);
  });

  it("同一口令派生结果稳定，且不泄露明文口令", () => {
    vi.stubEnv("ADMIN_PASSWORD", "wedding");
    const value = sessionCookieValue();
    expect(value).toBe(sessionCookieValue());
    expect(value).not.toContain("wedding");
    expect(value).toHaveLength(64);
  });

  it("Cookie 为 httpOnly、根路径、30 天有效期", () => {
    const options = sessionCookieOptions(false);
    expect(ADMIN_COOKIE).toBe("wedding_lottery_admin");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(30 * 24 * 3600);
  });

  it("局域网 http 访问不加 Secure，否则浏览器会丢弃 Cookie", () => {
    expect(sessionCookieOptions(false).secure).toBe(false);
  });

  it("https 部署时加上 Secure", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
  });
});

describe("判断请求是否走 https", () => {
  function request(url: string, headers: Record<string, string> = {}) {
    return new Request(url, { headers });
  }

  it("反向代理的 x-forwarded-proto 优先", () => {
    expect(isHttps(request("http://localhost:3000/api/admin/login", { "x-forwarded-proto": "https" }))).toBe(
      true
    );
    expect(
      isHttps(request("https://example.com/api/admin/login", { "x-forwarded-proto": "http, https" })),
    ).toBe(false);
  });

  it("没有代理头时看 origin / referer", () => {
    expect(isHttps(request("http://localhost/api/admin/login", { origin: "https://wedding.com" }))).toBe(
      true
    );
    expect(
      isHttps(request("http://localhost/api/admin/login", { referer: "http://192.168.31.10:3000/admin" })),
    ).toBe(false);
  });

  it("代理头和业务头都没有时回落到请求自身协议", () => {
    expect(isHttps(request("https://wedding.com/api/admin/login"))).toBe(true);
    expect(isHttps(request("http://192.168.31.10:3000/api/admin/login"))).toBe(false);
  });
});
