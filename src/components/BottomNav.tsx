import { Link, useRouterState } from '@tanstack/react-router';
import { Home, PhoneCall, AlertCircle, Newspaper, Map, User, ShieldCheck, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LAST_VISIT_KEY = 'vigie_last_quartier_visit';

const baseItems = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/urgences', label: 'Urgences', icon: PhoneCall },
  { to: '/signaler', label: 'Signaler', icon: AlertCircle },
  { to: '/fil', label: 'Quartier', icon: Newspaper, badge: true },
  { to: '/carte', label: 'Carte', icon: Map },
  { to: '/profil', label: 'Profil', icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [userId, setUserId] = useState<string | null>(null);
  const [lastVisit, setLastVisit] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(LAST_VISIT_KEY) ?? 0);
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (pathname === '/fil') {
      const now = Date.now();
      localStorage.setItem(LAST_VISIT_KEY, String(now));
      setLastVisit(now);
    }
  }, [pathname]);

  const { data: roles } = useQuery({
    queryKey: ['user-roles-nav', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role, collectivity_id').eq('user_id', userId!);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const isMod = roles?.some((r) => r.role === 'moderator' || r.role === 'admin') ?? false;
  const isGlobalAdmin = roles?.some((r) => r.role === 'admin' && r.collectivity_id === null) ?? false;

  const { data: newCount } = useQuery({
    queryKey: ['reports', 'new-count', userId, lastVisit],
    enabled: !!userId && pathname !== '/fil',
    queryFn: async () => {
      if (!lastVisit) return 0;
      const since = new Date(lastVisit).toISOString();
      const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'published').gt('created_at', since);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const items = [
    ...baseItems,
    ...(isMod ? [{ to: '/admin' as const, label: 'Admin', icon: ShieldCheck, badge: false }] : []),
    ...(isGlobalAdmin ? [{ to: '/platform' as const, label: 'Plateforme', icon: Settings, badge: false }] : []),
  ];

  return (
    <nav className='sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
      <div className='mx-auto grid max-w-2xl' style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map(({ to, label, icon: Icon, ...rest }) => {
          const hasBadge = (rest as { badge?: boolean }).badge;
          const active = pathname === to || pathname.startsWith(to + '/');
          const showBadge = hasBadge && (newCount ?? 0) > 0 && pathname !== '/fil';
          return (
            <Link key={to} to={to} className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <div className='relative'>
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} />
                {showBadge && <span className='absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sos text-[9px] font-bold text-sos-foreground'>{(newCount ?? 0) > 9 ? '9+' : newCount}</span>}
              </div>
              {label}
            </Link>
          );
        })}
      </div>
      <div className='h-[env(safe-area-inset-bottom)]' />
    </nav>
  );
}
