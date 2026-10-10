"use client";

import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/page-skeleton";
import { StateBlock } from "@/components/state-block";
import { useSnapshot } from "@/lib/use-snapshot";
import type { Snapshot } from "@/lib/types";

interface Props {
  eventId: string;
  children: (ctx: { snapshot: Snapshot; refresh: () => Promise<unknown> }) => ReactNode;
}

/** 三端共用的数据外壳：加载中给骨架，失败给可重试的错误态，绝不白屏 */
export function SnapshotGate({ eventId, children }: Props) {
  const { snapshot, error, refresh } = useSnapshot(eventId);

  if (!snapshot) {
    if (error) {
      return (
        <StateBlock
          tone="error"
          icon={<RotateCw className="h-7 w-7" />}
          title="数据加载失败"
          description={error}
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              重新加载
            </Button>
          }
        />
      );
    }
    return <PageSkeleton />;
  }

  return <>{children({ snapshot, refresh })}</>;
}
