import type { Prisma } from "@prisma/client";

/**
 * 顺序号取自活动上的计数器，自增而不是取最大值，
 * 这样删除最后加入的来宾也不会让编号被下一个人复用。
 */
export async function nextTicketNo(tx: Prisma.TransactionClient, eventId: string): Promise<number> {
  const updated = await tx.event.update({
    where: { id: eventId },
    data: { lastTicketNo: { increment: 1 } },
    select: { lastTicketNo: true },
  });
  return updated.lastTicketNo;
}
