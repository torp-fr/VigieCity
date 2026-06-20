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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { Toaster } from "../components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

// Routes qui ne nécessitent pas de vérification d'onboarding ni de BottomNav
const SKIP_ONBOARDING_ROUTES = [
  "/auth",
  "/onboarding",
  "/profil",
  "/mentions-legales",
  "/confidentialite",
  "/forgot-password",
  "/reset-password",
];

// Routes sans BottomNav (admin, plateforme, auth, onboarding)
const HIDE_NAV_PREFIXES = ["/auth", "/onboarding", "/admin", "/platform", "/forgot-password", "/reset-password"];

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
            onClick={() => {
              router.invalidate();
              reset();
            }}
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1e3a8a" },
      { title: "VigieCity — Sécurité de proximité" },
      {
        name: "description",
        content:
          "VigieCity : numéros d'urgence, alerte SOS, signalement et fil de quartier pour habitants et voisins vigilants.",
      },
      { property: "og:title", content: "VigieCity — Sécurité de proximité" },
      {
        property: "og:description",
        content: "L'app citoyenne de sécurité de proximité, en lien avec votre commune.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Gestion de la réinitialisation du mot de passe
      if (event === "PASSWORD_RECOVERY") {
        navigate({ to: "/reset-password" });
        return;
      }

      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();

      // Après connexion, vérifier si l'utilisateur a besoin de l'onboarding
      if (event === "SIGNED_IN" && session?.user) {
        if (SKIP_ONBOARDING_ROUTES.includes(pathname)) return;
        // Court délai pour laisser le trigger DB propager le profil auto-créé
        await new Promise((r) => setTimeout(r, 500));
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", session.user.id)
          .single();
        if (!profile?.collectivity_id) {
          navigate({ to: "/onboarding" });
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient, navigate, pathname]);

  // Au montage, vérifier si l'utilisateur connecté a besoin de l'onboarding
  useEffect(() => {
    if (SKIP_ONBOARDING_ROUTES.includes(pathname)) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      // Retry une fois après 600ms pour éviter la race condition post-inscription
      const checkOnboarding = async (isRetry = false): Promise<void> => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("collectivity_id")
          .eq("id", session.user.id)
          .single();
        if (!profile?.collectivity_id) {
          if (!isRetry) {
            await new Promise((r) => setTimeout(r, 600));
            return checkOnboarding(true);
          }
          navigate({ to: "/onboarding" });
        }
      };
      await checkOnboarding();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showNav = !HIDE_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-background">
        <AppHeader />
        <main className="flex-1 pb-4">
          <Outlet />
        </main>
        {showNav && <BottomNav />}
      </div>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
