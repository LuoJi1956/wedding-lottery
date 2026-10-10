import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE,
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
    const options = sessionCookieOptions();
    expect(ADMIN_COOKIE).toBe("wedding_lottery_admin");
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(30 * 24 * 3600);
  });

  it("生产环境才给 Cookie 加 Secure 标记", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieOptions().secure).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookieOptions().secure).toBe(false);
  });
});
