/** @format */

"use client";

import { useRouter, usePathname } from "next/navigation";

interface WeekNavBarProps {
  weekLabel: string;
  weekOffset: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  /** 'light' = white bg (default), 'dark' = navy bg for gradient headers */
  variant?: "light" | "dark";
}

export default function WeekNavBar({
  weekLabel,
  weekOffset,
  canGoPrev,
  canGoNext,
  variant = "light",
}: WeekNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(delta: number) {
    const next = weekOffset + delta;
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`);
  }

  const isCurrentWeek = weekOffset === 0;
  const isDark = variant === "dark";

  return (
    <div className="flex items-center">
      <div
        className={
          isDark
            ? "inline-flex items-center rounded-lg bg-[#1e3a5f] w-full"
            : "inline-flex items-center border border-[rgba(30,58,95,0.15)] rounded-[14px] bg-white"
        }
      >
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoPrev}
          className={
            isDark
              ? "w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 text-[13px] text-white/70 disabled:opacity-30 transition-colors"
              : "w-7 h-7 flex items-center justify-center rounded-[14px] bg-[rgba(30,58,95,0.06)] text-[13px] text-[#1e3a5f] disabled:opacity-30 hover:bg-[rgba(30,58,95,0.12)] transition-colors"
          }
          aria-label="Semana anterior"
        >
          ←
        </button>
        <span
          className={
            isDark
              ? "flex-1 text-xs font-medium text-white whitespace-nowrap text-center py-1"
              : "px-10 text-xs font-medium text-[#1e3a5f] whitespace-nowrap text-center"
          }
        >
          {weekLabel}
        </span>
        <button
          onClick={() => navigate(1)}
          disabled={!canGoNext}
          className={
            isDark
              ? "w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 text-[13px] text-white/70 disabled:opacity-30 transition-colors"
              : "w-7 h-7 flex items-center justify-center rounded-[14px] bg-[rgba(30,58,95,0.06)] text-[13px] text-[#1e3a5f] disabled:opacity-30 hover:bg-[rgba(30,58,95,0.12)] transition-colors"
          }
          aria-label="Semana siguiente"
        >
          →
        </button>
      </div>
      {!isCurrentWeek && !isDark && (
        <button
          onClick={() => router.push(pathname)}
          className="ml-2 text-xs font-semibold text-[#ea580c] hover:text-[#ea6c0a] transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
