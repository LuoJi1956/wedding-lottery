import type { Event, Participant, Prize, Winner } from "@prisma/client";
import type { EventConfig, EventStatus, Participant as DomainParticipant, Prize as DomainPrize, Winner as DomainWinner } from "@/lib/types";

const STATUSES: EventStatus[] = ["draft", "active", "ended"];

/** SQLite 没有原生枚举，读到非法值时退回 draft，避免脏数据把大屏打挂 */
function toStatus(value: string): EventStatus {
  return STATUSES.includes(value as EventStatus) ? (value as EventStatus) : "draft";
}

export function toEventConfig(event: Event): EventConfig {
  return {
    id: event.id,
    name: event.name,
    subtitle: event.subtitle,
    status: toStatus(event.status),
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    maxParticipants: event.maxParticipants,
    backgroundUrl: event.backgroundUrl,
    allowRepeatWin: event.allowRepeatWin,
  };
}

export function toPrize(prize: Prize): DomainPrize {
  return {
    id: prize.id,
    eventId: prize.eventId,
    name: prize.name,
    iconUrl: prize.iconUrl,
    winnerCount: prize.winnerCount,
    drawBatchSize: prize.drawBatchSize,
    sortOrder: prize.sortOrder,
  };
}

export function toParticipant(participant: Participant): DomainParticipant {
  return {
    id: participant.id,
    eventId: participant.eventId,
    name: participant.name,
    phone: participant.phone,
    deviceId: participant.deviceId,
    ticketNo: participant.ticketNo,
    joinedAt: participant.joinedAt.toISOString(),
  };
}

export function toWinner(winner: Winner): DomainWinner {
  return {
    id: winner.id,
    eventId: winner.eventId,
    prizeId: winner.prizeId,
    participantId: winner.participantId,
    drawnAt: winner.drawnAt.toISOString(),
    revokedAt: winner.revokedAt?.toISOString() ?? null,
  };
}
