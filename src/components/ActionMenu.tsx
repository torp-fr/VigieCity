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
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); }
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', close); };
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="min-w-44 rounded-xl border border-border bg-card shadow-2xl py-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
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
    </>
  );
}
