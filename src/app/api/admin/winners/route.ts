import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/admin-auth";
import { prisma } from "@/lib/server/db";
import { fail, ok, parseQuery } from "@/lib/server/http";
import { toWinner } from "@/lib/server/serialize";
import { stringIdSchema } from "@/lib/validation";

/** 撤销中奖：只打 revokedAt 标记，历史与统计口径都保留可追溯 */
export async function DELETE(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const id = parseQuery(request, stringIdSchema)?.id;
  if (!id) return fail("缺少中奖记录标识");

  try {
    const revoked = await prisma.winner.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return ok(toWinner(revoked));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail("中奖记录不存在或已被删除", 404);
    }
    throw err;
  }
}
