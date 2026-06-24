import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ── PageHeader ─────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
          {Icon && <Icon className="h-6 w-6 text-slate-400" />}
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

// ── PageShell ──────────────────────────────────────────────────────────────────

interface PageShellProps {
  children: ReactNode;
  /** Extra Tailwind classes on the inner container (e.g. "max-w-2xl") */
  className?: string;
}

/**
 * Inner content wrapper for all admin/platform pages.
 * Provides consistent max-width, padding, and background on desktop.
 *
 * Usage:
 *   <AdminShell activePath="/admin/foo">
 *     <PageShell>
 *       <PageHeader icon={FooIcon} title="Foo" subtitle="…" action={<button>…</button>} />
 *       {/* page content *\/}
 *     </PageShell>
 *   </AdminShell>
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-8 py-8 ${className}`}>
      {children}
    </div>
  );
}
