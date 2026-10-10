import { cn } from "@/lib/utils";

export function PageSkeleton({ className, lines = 4 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("animate-pulse space-y-4", className)} role="status" aria-label="加载中">
      <div className="h-8 w-52 rounded-lg bg-muted" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted/70" />
      ))}
    </div>
  );
}
