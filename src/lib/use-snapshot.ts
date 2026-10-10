"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Snapshot } from "@/lib/types";

/** 大屏/后台每 3 秒拉一次快照，后台撤销中奖后大屏的剩余名额会自动回补 */
const POLL_INTERVAL_MS = 3_000;

export function useSnapshot(eventId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.snapshot(eventId);
    if (res.ok) {
      setSnapshot(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    return res;
  }, [eventId]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await api.snapshot(eventId);
      if (!alive) return;
      if (res.ok) {
        setSnapshot(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    };
    void tick();
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [eventId]);

  return { snapshot, error, refresh: load };
}
