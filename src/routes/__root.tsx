import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import posthog from "posthog-js";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// ── PostHog — analytics GDPR-compliant (EU Cloud Frankfurt) ──────────────────
// Clé lue depuis VITE_POSTHOG_KEY (variable Vercel, injectée au build)
// En local dev : PostHog ne s'initialise pas (pas de tracking dev involontaire)
// rebuild: 2026-06-21
const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY as string) ?? "";
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host:          "https://eu.i.posthog.com",
    ui_host:           "https://eu.posthog.com",
    person_profiles:   "identified_only",
    capture_pageview:  true,
    capture_pageleave: true,
    autocapture:       false,
    session_recording: { maskAllInputs: true },
  });
}

import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { CookieBanner } from "../components/CookieBanner";
import { Toaster } from "../components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

// Routes that don't require onboarding check
const SKIP_ONBOARDING_ROUTES = [
  "/auth", "/onboarding", "/profil", "/mentions-legales",
  "/confidentialite", "/cgu", "/admin/login",
];
const ADMIN_ROLES = ["commune_admin", "interco_admin", "super_admin"] as const;

// Routes rendered without the app shell (header / bottom nav)
const SHELL_FREE_ROUTES = [
  "/", "/landing", "/auth",
  "/admin/login", "/admin/reset-password", "/admin/accept-invite",
  "/mentions-legales", "/confidentialite", "/cgu",
];

// ── 404 ───────────────────────────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Cette page n'a pas chargé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Réessayez ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Route definition ──────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1e3a8a" },
      { title: "VigieCity — Sécurité de proximité" },
      {
        name: "description",
        content: "VigieCity : numéros d'urgence, alerte SOS, signalement et fil de quartier pour habitants et voisins vigilants.",
      },
      { property: "og:title",       content: "VigieCity — Sécurité de proximité" },
      { property: "og:description", content: "L'app citoyenne de sécurité de proximité, en lien avec votre commune." },
      { property: "og:type",        content: "website" },
      { name: "twitter:card",       content: "summary" },
    ],
    links: [
      { rel: "stylesheet",       href: appCss },
      { rel: "icon",             type: "image/svg+xml",  href: "/icons/icon.svg" },
      { rel: "manifest",         href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent:    RootShell,
  component:         RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent:    ErrorComponent,
});

// ── HTML shell ────────────────────────────────────────────────────────────────

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
        {/* J10 — Performance: preconnect aux origines critiques */}
        <link rel="preconnect" href="https://xfhkngecpbvmlstjymfy.supabase.co" />
        <link rel="preconnect" href="https://eu.i.posthog.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.open-meteo.com" />
        <link rel="dns-prefetch" href="https://overpass-api.de" />
        {/* J10 — theme-color dark/light pour iOS Safari */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#1e3a8a" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#1e3a8a" />
        {/* J10 — iOS PWA meta */}
        <meta name="apple-mobile-web-app-capable"        content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"          content="VigieCity" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router   = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // BUG-010: éviter le closure stale de pathname dans onAuthStateChange (deps=[])
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const isShellFree  = SHELL_FREE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/platform");

  // ── Register Service Worker (J3.1) ────────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered, scope:", reg.scope);
          reg.update();
        })
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }
  }, []);

  // ── Auth state → PostHog identify + onboarding redirect ──────────────────
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) return;

      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();

      if (event === "SIGNED_OUT") {
        posthog.reset();
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        if (SKIP_ONBOARDING_ROUTES.includes(pathnameRef.current)) return;

        await new Promise((r) => setTimeout(r, 500));

        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id, role")
          .eq("id", session.user.id)
          .single();

        // PostHog identify avec commune pour filtrage analytics
        if (profile?.collectivity_id) {
          const { data: coll } = await supabase
            .from("collectivities")
            .select("name, department_code, region")
            .eq("id", profile.collectivity_id)
            .single();
          posthog.identify(session.user.id, {
            email:           session.user.email,
            role:            profile.role ?? "citizen",
            collectivity_id: profile.collectivity_id,
            commune:         coll?.name ?? null,
            department:      coll?.department_code ?? null,
            region:          coll?.region ?? null,
          });
        } else {
          posthog.identify(session.user.id, {
            email: session.user.email,
            role:  profile?.role ?? "citizen",
          });
        }

        // Admin roles → redirect to /admin/ (dashboard)
        const role = profile?.role as string;
        if (ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
          if (!pathnameRef.current.startsWith("/admin") && !pathnameRef.current.startsWith("/platform")) {
            navigate({ to: "/admin/" });
          }
          return;
        }

        // Citoyen sans commune → onboarding
        if (!profile?.collectivity_id) {
          navigate({ to: "/onboarding" });
        }
      }
    });

    return () => data.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <QueryClientProvider client={queryClient}>
      {isShellFree || isAdminRoute ? (
        <Outlet />
      ) : (
        <div className="flex min-h-[100dvh] flex-col bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <AppHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <BottomNav />
        </div>
      )}
      <Toaster />
      <CookieBanner />
    </QueryClientProvider>
  );
}
