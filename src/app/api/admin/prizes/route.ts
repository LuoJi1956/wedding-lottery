import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/admin-auth";
import { prisma } from "@/lib/server/db";
import { fail, ok, parseBody, parseQuery } from "@/lib/server/http";
import { toPrize } from "@/lib/server/serialize";
import { prizeSchema, stringIdSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, prizeSchema);
  if ("response" in parsed) return parsed.response;
  const { eventId, id, iconUrl, name, winnerCount, drawBatchSize, sortOrder } = parsed.data;

  if (id) {
    const drawn = await prisma.winner.count({ where: { prizeId: id, revokedAt: null } });
    if (winnerCount < drawn) {
      return fail(`该奖项已抽出 ${drawn} 人，名额不能小于已抽人数`);
    }
  }

  const data = { eventId, name, winnerCount, drawBatchSize, sortOrder, iconUrl: iconUrl || null };

  try {
    const prize = id
      ? await prisma.prize.update({ where: { id }, data })
      : await prisma.prize.create({ data });
    return ok(toPrize(prize));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return fail(`奖项「${name}」已存在，请改个名称`);
      if (err.code === "P2025") return fail("奖项不存在或已被删除", 404);
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const id = parseQuery(request, stringIdSchema)?.id;
  if (!id) return fail("缺少奖项标识");

  const drawn = await prisma.winner.count({ where: { prizeId: id, revokedAt: null } });
  if (drawn > 0) return fail("该奖项已有中奖记录，请先撤销后再删除", 409);

  try {
    await prisma.prize.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail("奖项不存在或已被删除", 404);
    }
    throw err;
  }
  return ok({ id });
}
