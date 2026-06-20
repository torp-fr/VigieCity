// Route /landing → redirige vers / (landing page)
// Maintenu pour compatibilité avec d'éventuels liens existants.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/landing")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: () => null,
});
