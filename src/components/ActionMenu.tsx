import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

type Action = {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
};

export function ActionMenu({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-44 rounded-xl border border-border bg-card shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                type="button"
                disabled={a.disabled}
                onClick={(e) => { e.stopPropagation(); a.onClick(); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                  a.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
