"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SnapshotGate } from "@/components/snapshot-gate";
import { Spinner, StateBlock } from "@/components/state-block";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import { evaluatedWinners } from "@/lib/derive";
import { formatTicketNo } from "@/lib/format";
import { downloadCsv, formatDateTime, maskPhone, toCsv } from "@/lib/utils";
import { PHONE_REGEX } from "@/lib/validation";
import type { Snapshot } from "@/lib/types";

export default function AdminParticipantsPage() {
  return (
    <SnapshotGate eventId={DEFAULT_EVENT_ID}>
      {({ snapshot, refresh }) => (
        <ParticipantsTable snapshot={snapshot} refresh={refresh} />
      )}
    </SnapshotGate>
  );
}

function ParticipantsTable({
  snapshot,
  refresh,
}: {
  snapshot: Snapshot;
  refresh: () => Promise<unknown>;
}) {
  const [keyword, setKeyword] = useState("");
  const [manual, setManual] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const winnersMap = evaluatedWinners(snapshot);
  const list = useMemo(() => {
    const kw = keyword.trim();
    return [...snapshot.participants]
      .sort((a, b) => a.ticketNo - b.ticketNo)
      .filter(
        (p) =>
          !kw ||
          p.name.includes(kw) ||
          (p.phone ?? "").includes(kw) ||
          formatTicketNo(p.ticketNo).includes(kw.toUpperCase()),
      );
  }, [snapshot.participants, keyword]);

  async function addManual() {
    if (adding) return;
    const name = manual.name.trim();
    if (!name) {
      setError("请填写姓名");
      return;
    }
    if (manual.phone && !PHONE_REGEX.test(manual.phone)) {
      setError("手机号格式不正确");
      return;
    }
    setAdding(true);
    setError("");
    const res = await api.addParticipant({
      eventId: snapshot.event.id,
      name,
      phone: manual.phone || undefined,
    });
    setAdding(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setManual({ name: "", phone: "" });
    await refresh();
  }

  function exportCsv() {
    const rows: string[][] = [["编号", "姓名", "手机号", "参与时间", "是否中奖", "奖项"]];
    for (const p of list) {
      const won = winnersMap.get(p.id);
      rows.push([
        formatTicketNo(p.ticketNo),
        p.name,
        p.phone ?? "",
        formatDateTime(p.joinedAt),
        won ? "已中奖" : "未中奖",
        won?.prizeName ?? "",
      ]);
    }
    downloadCsv(`参与名单_${list.length}人.csv`, toCsv(rows));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">参与名单</h1>
          <p className="text-sm text-muted-foreground">
            共 {snapshot.participants.length} 人参与 · 已中奖 {winnersMap.size} 人
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={list.length === 0}>
          <Download className="h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="search">搜索</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={keyword}
                placeholder="姓名 / 手机号 / 编号"
                className="pl-10"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void addManual();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="manual-name">手动添加 · 姓名</Label>
              <Input
                id="manual-name"
                value={manual.name}
                maxLength={20}
                placeholder="现场未扫码的亲友"
                onChange={(e) => setManual({ ...manual, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-phone">
                手机号 <span className="text-muted-foreground">（选填）</span>
              </Label>
              <Input
                id="manual-phone"
                value={manual.phone}
                inputMode="numeric"
                maxLength={11}
                placeholder="11 位手机号"
                onChange={(e) => setManual({ ...manual, phone: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <Button type="submit" variant="gold" disabled={adding}>
              {adding ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              加入名单
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <StateBlock
          title={keyword ? "没有匹配的来宾" : "还没有人参与"}
          description={keyword ? "换个关键字试试，或手动添加未到场的亲友" : "把参与二维码投在屏幕上，来宾扫码后即可出现在这里"}
          icon={<Users className="h-7 w-7" />}
        />
      ) : (
        <Table className="min-w-[44rem]">
          <THead>
            <TR>
              <TH>编号</TH>
              <TH>姓名</TH>
              <TH>手机号</TH>
              <TH>参与时间</TH>
              <TH>中奖情况</TH>
              <TH className="text-right">操作</TH>
            </TR>
          </THead>
          <TBody>
            {list.map((p) => {
              const won = winnersMap.get(p.id);
              return (
                <TR key={p.id}>
                  <TD className="font-medium text-gold-deep">{formatTicketNo(p.ticketNo)}</TD>
                  <TD>{p.name}</TD>
                  <TD className="text-muted-foreground">{maskPhone(p.phone)}</TD>
                  <TD className="text-muted-foreground">{formatDateTime(p.joinedAt)}</TD>
                  <TD>
                    {won ? (
                      <Badge variant="gold">
                        {won.prizeName} · {formatDateTime(won.drawnAt)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <ConfirmDialog
                        title={`删除「${p.name}」？`}
                        description="该来宾的参与记录会一并删除（含已撤销的中奖历史），删除后同一台手机可以重新报名。"
                        confirmText="删除"
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                            删除
                          </Button>
                        }
                        onConfirm={async () => {
                          const res = await api.deleteParticipant(p.id);
                          if (!res.ok) {
                            setError(res.error);
                            return;
                          }
                          await refresh();
                        }}
                      />
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <p className="text-xs text-muted-foreground">
        编号按加入顺序自增（如 {formatTicketNo(1)}），删除来宾后编号不会被复用。
      </p>
    </div>
  );
}
