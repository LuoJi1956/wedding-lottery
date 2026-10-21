import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { requireAdmin } from "@/lib/server/admin-auth";
import { fail, ok } from "@/lib/server/http";

/** 本地磁盘落点：现场笔记本/自有服务器可用；Serverless 平台文件系统只读，见 README 部署章节 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 3 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const KINDS = new Set(["background", "icon"]);

export async function POST(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("请选择要上传的图片");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("请选择要上传的图片");

  const kind = String(form.get("kind") ?? "background");
  if (!KINDS.has(kind)) return fail("图片来源不正确");

  const ext = EXT_BY_MIME[file.type];
  if (!ext) return fail("只支持 PNG / JPG / WebP / GIF 格式的图片");
  if (file.size === 0) return fail("图片内容为空");
  if (file.size > MAX_BYTES) return fail("图片超过 3MB，请压缩后再上传");

  // 文件名完全由服务端生成，不使用客户端提供的名称，避免路径穿越
  const name = `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    // Netlify/Vercel 的函数目录是只读的，这里不报成“磁盘有问题”，直接指路外链
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      return fail("当前部署环境的磁盘只读，无法保存上传的图片，请改填 http(s) 开头的图片外链", 503);
    }
    return fail("图片保存失败，请确认服务所在磁盘可写", 500);
  }

  return ok({ url: `/uploads/${name}` }, 201);
}
