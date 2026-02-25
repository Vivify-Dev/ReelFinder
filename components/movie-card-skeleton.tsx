export function MovieCardSkeleton() {
  return (
    <div className="h-full animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="aspect-[2/3] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded-full bg-white/10" />
        <div className="h-3 w-1/3 rounded-full bg-white/10" />
        <div className="h-10 w-full rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
