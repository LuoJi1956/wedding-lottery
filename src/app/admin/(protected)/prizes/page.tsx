"use client";

import { useState } from "react";
import { Eraser, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StateBlock } from "@/components/state-block";
import { UploadImageButton } from "@/components/upload-image-button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { api } from "@/lib/api";
import { SnapshotGate } from "@/components/snapshot-gate";
import { DEFAULT_EVENT_ID } from "@/lib/constants";
import { drawnCountOf } from "@/lib/derive";
import { prizeSchema, firstIssue } from "@/lib/validation";
import type { Prize, Snapshot } from "@/lib/types";

interface Draft {
  id: string;
  name: string;
  winnerCount: string;
  drawBatchSize: string;
  sortOrder: string;
  iconUrl: string;
}

function emptyDraft(order: number): Draft {
  return {
    id: "",
    name: "",
    winnerCount: "1",
    drawBatchSize: "1",
    sortOrder: String(order),
    iconUrl: "",
  };
}

export default function AdminPrizesPage() {
  return (
    <SnapshotGate eventId={DEFAULT_EVENT_ID}>
      {({ snapshot, refresh }) => <PrizesTable snapshot={snapshot} refresh={refresh} />}
    </SnapshotGate>
  );
}

function PrizesTable({
  snapshot,
  refresh,
}: {
  snapshot: Snapshot;
  refresh: () => Promise<unknown>;
}) {
  const { prizes, event } = snapshot;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = [...prizes].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalSeats = sorted.reduce((sum, p) => sum + p.winnerCount, 0);

  function startCreate() {
    setError("");
    setDraft(emptyDraft(sorted.length + 1));
  }

  function startEdit(prize: Prize) {
    setError("");
    setDraft({
      id: prize.id,
      name: prize.name,
      winnerCount: String(prize.winnerCount),
      drawBatchSize: String(prize.drawBatchSize),
      sortOrder: String(prize.sortOrder),
      iconUrl: prize.iconUrl ?? "",
    });
  }

  async function submit() {
    if (!draft || saving) return;
    const parsed = prizeSchema.safeParse({
      eventId: event.id,
      id: draft.id || undefined,
      name: draft.name,
      winnerCount: Number(draft.winnerCount),
      drawBatchSize: Number(draft.drawBatchSize),
      sortOrder: Number(draft.sortOrder),
      iconUrl: draft.iconUrl,
    });
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    const alreadyDrawn = drawnCountOf(snapshot, parsed.data.id ?? "");
    if (parsed.data.id && parsed.data.winnerCount < alreadyDrawn) {
      setError(`该奖项已抽出 ${alreadyDrawn} 人，名额不能小于已抽人数`);
      return;
    }
    setSaving(true);
    setError("");
    const res = await api.upsertPrize(parsed.data);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refresh();
    setDraft(null);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">奖项设置</h1>
          <p className="text-sm text-muted-foreground">
            共 {sorted.length} 个奖项 · 合计 {totalSeats} 个中奖名额
          </p>
        </div>
        <Button variant="gold" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          新增奖项
        </Button>
      </div>

      {sorted.length === 0 ? (
        <StateBlock
          title="还没有奖项"
          description="先添加一等奖、二等奖、三等奖，大屏才能开始抽奖"
          icon={<Trophy className="h-7 w-7" />}
          action={<Button onClick={startCreate}>新增奖项</Button>}
        />
      ) : (
        <Table className="min-w-[48rem]">
          <THead>
            <TR>
              <TH>排序</TH>
              <TH>奖项名称</TH>
              <TH>中奖人数</TH>
              <TH>单次抽取</TH>
              <TH>已抽 / 剩余</TH>
              <TH>图标</TH>
              <TH className="text-right">操作</TH>
            </TR>
          </THead>
          <TBody>
            {sorted.map((p) => {
              const drawn = drawnCountOf(snapshot, p.id);
              return (
                <TR key={p.id}>
                  <TD className="text-muted-foreground">{p.sortOrder}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>{p.winnerCount}</TD>
                  <TD className="text-muted-foreground">
                    {p.drawBatchSize < p.winnerCount ? `每轮 ${p.drawBatchSize} 人` : "一次抽完"}
                  </TD>
                  <TD>
                    <Badge variant="muted">{drawn} 已抽</Badge>
                    <Badge variant="gold" className="ml-1.5">
                      {Math.max(p.winnerCount - drawn, 0)} 剩余
                    </Badge>
                  </TD>
                  <TD className="max-w-40">
                    {p.iconUrl ? (
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.iconUrl}
                          alt={`${p.name}图标`}
                          className="h-7 w-7 shrink-0 object-contain"
                        />
                        <span className="truncate text-xs text-muted-foreground">{p.iconUrl}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">未设置</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                        编辑
                      </Button>
                      <ConfirmDialog
                        title={`删除「${p.name}」？`}
                        description="该奖项的中奖记录也会一并移除，无法恢复。"
                        confirmText="删除"
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                            删除
                          </Button>
                        }
                        onConfirm={async () => {
                          const res = await api.deletePrize(p.id);
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

      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle>{draft.id ? "编辑奖项" : "新增奖项"}</CardTitle>
            <CardDescription>图标可直接上传图片，也可以粘贴外链地址</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="prize-name">奖项名称</Label>
                <Input
                  id="prize-name"
                  value={draft.name}
                  maxLength={20}
                  placeholder="一等奖"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-count">中奖人数（名额）</Label>
                <Input
                  id="prize-count"
                  type="number"
                  min={1}
                  value={draft.winnerCount}
                  onChange={(e) => setDraft({ ...draft, winnerCount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-batch">单次抽奖人数</Label>
                <Input
                  id="prize-batch"
                  type="number"
                  min={1}
                  value={draft.drawBatchSize}
                  onChange={(e) => setDraft({ ...draft, drawBatchSize: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  余数不足一轮时一次抽完
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-order">排序（小在前）</Label>
                <Input
                  id="prize-order"
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prize-icon">奖项图标</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="prize-icon"
                  className="min-w-0 flex-1"
                  value={draft.iconUrl}
                  placeholder="留空则不显示图标；也可点右侧上传"
                  onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
                />
                <UploadImageButton
                  kind="icon"
                  label="上传图标"
                  onUploaded={(url) => setDraft({ ...draft, iconUrl: url })}
                  onError={setError}
                />
                {draft.iconUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="touch-target text-muted-foreground"
                    onClick={() => setDraft({ ...draft, iconUrl: "" })}
                  >
                    <Eraser className="h-4 w-4" />
                    清除
                  </Button>
                ) : null}
              </div>
              {draft.iconUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.iconUrl}
                    alt="奖项图标预览"
                    className="h-10 w-10 rounded border bg-muted/40 object-contain p-1"
                  />
                  <p className="truncate text-xs text-muted-foreground">{draft.iconUrl}</p>
                </div>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" variant="gold" disabled={saving}>
                {saving ? "保存中…" : "保存奖项"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                取消
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {error && !draft ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
