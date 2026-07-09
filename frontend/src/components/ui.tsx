import type { ReactNode } from "react";
import type { Category, SeatType } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold text-slate-800">{children}</h2>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub != null && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

const CATEGORY_STYLES: Record<Category, string> = {
  GENERAL: "bg-slate-100 text-slate-700",
  OBC: "bg-amber-100 text-amber-800",
  SC: "bg-sky-100 text-sky-800",
  ST: "bg-violet-100 text-violet-800",
};

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}>
      {category}
    </span>
  );
}

export function SeatBadge({ seatType }: { seatType: SeatType }) {
  const style = seatType === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${style}`}>{seatType}</span>;
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
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
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

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm text-slate-400">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>
  );
}
