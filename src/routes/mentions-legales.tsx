import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <div className="space-y-6 px-4 pt-5 pb-10">
      <header className="flex items-center gap-3">
        <Scale className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Mentions légales</h1>
      </header>

      <Section title="1. Éditeur du site">
        <p>
          VigieCity est édité par :{" "}
          <strong>Baptiste Loiseau</strong>, personne physique.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Email :{" "}
          <a href="mailto:contact@vigie-city.fr" className="text-primary underline">
            contact@vigie-city.fr
          </a>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          En application de l'article 6-III-1 de la loi n° 2004-575 du 21 juin 2004
          pour la confiance dans l'économie numérique (LCEN).
        </p>
      </Section>

      <Section title="2. Directeur de la publication">
        <p>
          Le directeur de la publication est <strong>Baptiste Loiseau</strong>.
        </p>
      </Section>

      <Section title="3. Hébergement">
        <p>
          <strong>Vercel Inc.</strong>
          <br />
          440 N Barranca Ave #4133
          <br />
          Covina, CA 91723, États-Unis
          <br />
          <a href="https://vercel.com" className="text-primary underline text-sm" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>
      </Section>

      <Section title="4. Base de données & infrastructure">
        <p>
          <strong>Supabase Inc.</strong> — hébergement base de données et authentification
          <br />
          970 Toa Payoh North, Singapour
          <br />
          <a href="https://supabase.com" className="text-primary underline text-sm" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Les données sont hébergées en région UE (West EU — Amsterdam).
        </p>
      </Section>

      <Section title="5. Propriété intellectuelle">
        <p>
          L'ensemble des contenus présents sur VigieCity (textes, graphiques, logotipos,
          code source) est la propriété exclusive de l'éditeur, sauf mention contraire.
          Toute reproduction, distribution ou utilisation sans autorisation préalable est
          interdite.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Les signalements publiés par les utilisateurs restent la propriété de leurs auteurs.
          En publiant un signalement, l'utilisateur concède à VigieCity une licence
          d'affichage non exclusive, limitée à la finalité de la plateforme.
        </p>
      </Section>

      <Section title="6. Limitation de responsabilité">
        <p>
          VigieCity est un outil d'information et d'alerte citoyenne. Les signalements
          et alertes publiés sur la plateforme ne se substituent <strong>en aucun cas</strong> aux
          services d'urgence officiels (17 — Police, 15 — SAMU, 18 — Pompiers, 112 — Numéro
          d'urgence européen).
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          L'éditeur ne saurait être tenu responsable des décisions prises sur la base
          des informations publiées par les utilisateurs.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          VigieCity utilise des cookies techniques strictement nécessaires au fonctionnement
          de l'authentification et de la session utilisateur. Aucun cookie publicitaire ou
          de traçage tiers n'est déposé.
        </p>
      </Section>

      <Section title="8. Droit applicable">
        <p>
          Les présentes mentions légales sont soumises au droit français. Tout litige
          relatif à leur interprétation sera de la compétence exclusive des tribunaux
          français.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Pour toute question relative aux présentes mentions légales :{" "}
          <a href="mailto:contact@vigie-city.fr" className="text-primary underline">
            contact@vigie-city.fr
          </a>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Dernière mise à jour : juin 2025
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="text-sm text-foreground/80 leading-relaxed space-y-1">{children}</div>
    </section>
  );
}
