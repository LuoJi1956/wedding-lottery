"use client";

import { useState } from "react";
import { Download, Trophy, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StateBlock } from "@/components/state-block";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { SnapshotGate } from "@/components/snapshot-gate";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import { formatTicketNo } from "@/lib/format";
import { downloadCsv, formatDateTime, maskPhone, toCsv } from "@/lib/utils";
import type { Participant, Prize, Snapshot, Winner } from "@/lib/types";

export default function AdminWinnersPage() {
  return (
    <SnapshotGate eventId={DEFAULT_EVENT_ID}>
      {({ snapshot, refresh }) => <WinnersBoard snapshot={snapshot} refresh={refresh} />}
    </SnapshotGate>
  );
}

function WinnersBoard({
  snapshot,
  refresh,
}: {
  snapshot: Snapshot;
  refresh: () => Promise<unknown>;
}) {
  const { prizes, winners, participants, event } = snapshot;
  const [showRevoked, setShowRevoked] = useState(false);

  const sortedPrizes = [...prizes].sort((a, b) => a.sortOrder - b.sortOrder);
  const participantById = new Map<number, Participant>(participants.map((p) => [p.id, p]));
  const active = winners.filter((w) => !w.revokedAt);
  const revoked = winners.filter((w) => w.revokedAt);

  function exportCsv() {
    const rows: string[][] = [["奖项", "编号", "姓名", "手机号", "中奖时间"]];
    for (const w of [...active].sort(byPrizeThenTime)) {
      const p = participantById.get(w.participantId);
      const prize = prizes.find((x) => x.id === w.prizeId);
      rows.push([
        prize?.name ?? "-",
        p ? formatTicketNo(p.ticketNo) : "-",
        p?.name ?? "-",
        p?.phone ?? "",
        formatDateTime(w.drawnAt),
      ]);
    }
    downloadCsv(`中奖名单_${active.length}人.csv`, toCsv(rows));
  }

  function byPrizeThenTime(a: Winner, b: Winner) {
    const orderA = sortedPrizes.findIndex((p) => p.id === a.prizeId);
    const orderB = sortedPrizes.findIndex((p) => p.id === b.prizeId);
    if (orderA !== orderB) return orderA - orderB;
    return a.drawnAt.localeCompare(b.drawnAt);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">中奖名单</h1>
          <p className="text-sm text-muted-foreground">
            {event.name} · 共 {active.length} 位中奖者
            {revoked.length > 0 ? ` · ${revoked.length} 条已撤销` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRevoked((v) => !v)}>
            {showRevoked ? "仅看有效中奖" : `查看已撤销（${revoked.length}）`}
          </Button>
          <Button variant="gold" onClick={exportCsv} disabled={active.length === 0}>
            <Download className="h-4 w-4" />
            导出 CSV
          </Button>
        </div>
      </div>

      {active.length === 0 && revoked.length === 0 ? (
        <StateBlock
          title="还没有开奖记录"
          description="在大屏页选择奖项并点击开始后，中奖者会实时出现在这里"
          icon={<Trophy className="h-7 w-7" />}
          action={
            <Button variant="gold" onClick={() => window.open("/screen", "_blank")}>
              前往抽奖大屏
            </Button>
          }
        />
      ) : (
        sortedPrizes.map((prize) => {
          const list = (showRevoked ? winners : active).filter((w) => w.prizeId === prize.id);
          if (list.length === 0) return null;
          return (
            <PrizeSection
              key={prize.id}
              prize={prize}
              winners={list.sort(byPrizeThenTime)}
              participantById={participantById}
              refresh={refresh}
            />
          );
        })
      )}
    </div>
  );
}

function PrizeSection({
  prize,
  winners,
  participantById,
  refresh,
}: {
  prize: Prize;
  winners: Winner[];
  participantById: Map<number, Participant>;
  refresh: () => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {prize.name}
          <Badge variant="gold">{winners.length} 位</Badge>
        </CardTitle>
        <CardDescription>本奖项设置 {prize.winnerCount} 个名额</CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[40rem]">
          <THead>
            <TR>
              <TH>编号</TH>
              <TH>姓名</TH>
              <TH>手机号</TH>
              <TH>中奖时间</TH>
              <TH>状态</TH>
              <TH className="text-right">操作</TH>
            </TR>
          </THead>
          <TBody>
            {winners.map((w) => {
              const p = participantById.get(w.participantId);
              const isRevoked = Boolean(w.revokedAt);
              return (
                <TR key={w.id} className={isRevoked ? "opacity-60" : undefined}>
                  <TD className="font-medium text-gold-deep">
                    {p ? formatTicketNo(p.ticketNo) : "-"}
                  </TD>
                  <TD className="font-medium">{p?.name ?? "已删除来宾"}</TD>
                  <TD className="text-muted-foreground">{maskPhone(p?.phone ?? null)}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(w.drawnAt)}</TD>
                  <TD>
                    {isRevoked ? (
                      <Badge variant="destructive">已撤销</Badge>
                    ) : (
                      <Badge variant="success">有效</Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      {isRevoked ? null : (
                        <ConfirmDialog
                          title={`撤销「${p?.name ?? "该来宾"}」的${prize.name}？`}
                          description="撤销后该名额会重新回到奖池，可再次抽奖。此操作仅在现场确认有误时使用。"
                          confirmText="确认撤销"
                          trigger={
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Undo2 className="h-4 w-4" />
                              撤销
                            </Button>
                          }
                          onConfirm={async () => {
                            const res = await api.revokeWinner(w.id);
                            if (!res.ok) {
                              setError(res.error);
                              return;
                            }
                            setError("");
                            await refresh();
                          }}
                        />
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
