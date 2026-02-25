"use client";

import { useRouter } from "next/navigation";

type RetryRefreshButtonProps = {
  label?: string;
  className?: string;
};

export function RetryRefreshButton({
  label = "Retry",
  className,
}: RetryRefreshButtonProps) {
  const router = useRouter();
  const baseClassName =
    "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:-translate-y-0.5 hover:shadow-cyan-400/30 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={className ? `${baseClassName} ${className}` : baseClassName}
    >
      {label}
    </button>
  );
}
