import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { ApiFailure } from "@/lib/types";
import { firstIssue } from "@/lib/validation";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** 所有失败响应共用这一形状：{ ok:false, error:string } */
export function fail(error: string, status = 400) {
  return NextResponse.json<ApiFailure>({ ok: false, error }, { status });
}

/**
 * 解析并校验请求体。校验不通过时返回 Response（错误消息取第一条 zod 提示），
 * 调用方直接 `return parsed.response` 即可。
 */
export async function parseBody<Out>(
  request: Request,
  schema: ZodType<Out>,
): Promise<{ data: Out } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: fail("请求体不是合法的 JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: fail(firstIssue(parsed.error)) };
  }
  return { data: parsed.data };
}

/** DELETE 类接口用查询串传 id，同样走 zod 校验 */
export function parseQuery<Out>(request: Request, schema: ZodType<Out>): Out | null {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  return parsed.success ? parsed.data : null;
}
