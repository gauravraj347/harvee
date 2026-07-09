import type { ReactNode } from "react";
import type { ColumnType } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50",
    danger: "text-red-600 hover:bg-red-50 disabled:opacity-50",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-label="loading"
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>;
}

const TYPE_STYLES: Record<ColumnType, string> = {
  integer: "bg-sky-100 text-sky-800",
  numeric: "bg-cyan-100 text-cyan-800",
  boolean: "bg-emerald-100 text-emerald-800",
  date: "bg-amber-100 text-amber-800",
  timestamp: "bg-amber-100 text-amber-800",
  text: "bg-slate-100 text-slate-600",
};

export function TypeBadge({ type }: { type: ColumnType }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_STYLES[type]}`}>{type}</span>;
}
