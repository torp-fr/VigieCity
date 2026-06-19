import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useNavigate, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import React, { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { AdminLayout } from "../components/AdminLayout";
import { PlatformLayout } from "../components/PlatformLayout";
import { Toaster } from "../components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const SKIP_ONBOARDING_ROUTES = ["/auth", "/onboarding", "/profil", "/mentions-legales", "/confidentialite", "/cgu", "/cgs"];
const ADMIN_PREFIXES = ["/admin"];
const PLATFORM_PREFIXES = ["/platform"];

function NotFoundComponent() {
  return (<div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold">Page introuvable</h2><p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Retour à l'accueil</Link></div></div></div>);
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (<div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold">Cette page n'a pas chargé</h1><p className="mt-2 text-sm text-muted-foreground">Une erreur est survenue.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Réessayer</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Accueil</a></div></div></div>);
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }, { name: "theme-color", content: "#1e3a8a" }, { title: "VigieCity — Sécurité de proximité" }, { name: "description", content: "VigieCity : numéros d'urgence, alerte SOS, signalement et fil de quartier." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "stylesheet", href: appCss }] }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function CookieBanner() {
  const [visible, setVisible] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('cookie_consent');
  });
  if (!visible) return null;
  const accept = () => { localStorage.setItem('cookie_consent', '1'); setVisible(false); };
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-2xl mx-auto">
      <p className="text-sm text-muted-foreground">
        Ce site utilise des cookies fonctionnels uniquement.{' '}
        <a href="/confidentialite" className="underline hover:text-foreground">Politique de confidentialité</a>
      </p>
      <div className="flex gap-2 shrink-0">
        <button onClick={accept} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Accepter
        </button>
        <a href="/confidentialite" className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          En savoir plus
        </a>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (<html lang="fr"><head><HeadContent /></head><body>{children}<Scripts /></body></html>);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isPlatformRoute = PLATFORM_PREFIXES.some((p) => pathname.startsWith(p));
  const isDesktopRoute = isAdminRoute || isPlatformRoute;
  const skipOnboarding = isDesktopRoute || SKIP_ONBOARDING_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      if (event === "SIGNED_IN" && session?.user && !skipOnboarding) {
        await new Promise((r) => setTimeout(r, 500));
        const { data: profile } = await supabase.from("profiles").select("collectivity_id").eq("id", session.user.id).single();
        if (!profile?.collectivity_id) navigate({ to: "/onboarding" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient, navigate, skipOnboarding]);

  useEffect(() => {
    if (skipOnboarding) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const check = async (retry = false): Promise<void> => {
        const { data: profile } = await supabase.from("profiles").select("collectivity_id").eq("id", session.user.id).single();
        if (!profile?.collectivity_id) {
          if (!retry) { await new Promise((r) => setTimeout(r, 600)); return check(true); }
          navigate({ to: "/onboarding" });
        }
      };
      await check();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPlatformRoute) return (<QueryClientProvider client={queryClient}><PlatformLayout /></QueryClientProvider>);
  if (isAdminRoute) return (<QueryClientProvider client={queryClient}><AdminLayout /></QueryClientProvider>);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-background">
        <AppHeader />
        <main className="flex-1 pb-4"><Outlet /></main>
        <BottomNav />
      </div>
      <CookieBanner />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
