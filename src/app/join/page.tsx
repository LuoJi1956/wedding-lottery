import { JoinView } from "./join-view";
import { DEFAULT_EVENT_ID } from "@/lib/constants";

export const metadata = { title: "参与抽奖 · 答谢宴抽奖系统" };

export default function JoinPage({
  searchParams,
}: {
  searchParams?: { e?: string };
}) {
  return <JoinView eventId={searchParams?.e ?? DEFAULT_EVENT_ID} />;
}
