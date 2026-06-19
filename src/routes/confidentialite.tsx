import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — VigieCity" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <div className="space-y-6 px-4 pt-5 pb-10">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conformément au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés
          </p>
        </div>
      </header>

      <Section title="1. Responsable du traitement">
        <p>
          <strong>Baptiste Loiseau</strong> — VigieCity
          <br />
          Email DPO / contact : {" "}
          <a href="mailto:privacy@vigie-city.fr" className="text-primary underline">
            privacy@vigie-city.fr
          </a>
        </p>
      </Section>

      <Section title="2. Données collectées et finalités">
        <table className="w-full text-xs border-collapse mt-1">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-3 font-semibold text-muted-foreground">Données</th>
              <th className="text-left py-1.5 pr-3 font-semibold text-muted-foreground">Finalité</th>
              <th className="text-left py-1.5 font-semibold text-muted-foreground">Base légale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <Row d="Adresse email" f="Authentification et communication" b="Contrat (CGU)" />
            <Row d="Pseudonyme / prénom" f="Identification sur la plateforme" b="Contrat" />
            <Row d="Coordonnées GPS approximatives" f="Localisation d'un signalement" b="Consentement" />
            <Row d="Description du signalement" f="Alerte de voisinage" b="Intérêt légitime" />
            <Row d="Photos jointes aux signalements" f="Illustration du signalement" b="Consentement" />
            <Row d="Contacts de confiance (nom, tél.)" f="Alerte SOS automatique" b="Consentement" />
            <Row d="Abonnement push (endpoint, clés)" f="Notifications d'alerte" b="Consentement" />
            <Row d="Événements SOS (date, commune)" f="Journalisation des urgences" b="Intérêt légitime" />
            <Row d="Logs de connexion (IP horodatée)" f="Sécurité et lutte contre la fraude" b="Obligation légale" />
          </tbody>
        </table>
      </Section>

      <Section title="3. Données de géolocalisation">
        <p>
          Les coordonnées GPS sont <strong>approximées</strong> (rayon ~50 m) avant stockage pour
          limiter la précision. L'adresse exacte n'est jamais enregistrée. Le partage de
          localisation est <strong>toujours facultatif</strong> : vous pouvez soumettre un signalement
          sans activer la géolocalisation.
        </p>
        <p className="mt-2 text-muted-foreground">
          Base légale : consentement explicite recueilli au moment de la demande de permission
          de géolocalisation dans l'application (art. 6.1.a RGPD).
        </p>
      </Section>

      <Section title="4. Durées de conservation">
        <table className="w-full text-xs border-collapse mt-1">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-3 font-semibold text-muted-foreground">Donnée</th>
              <th className="text-left py-1.5 font-semibold text-muted-foreground">Durée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Compte utilisateur (email, profil)</td>
              <td className="py-1.5">Jusqu'à suppression du compte + 30 jours</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Signalements publiés</td>
              <td className="py-1.5">12 mois après publication</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Alertes mairie</td>
              <td className="py-1.5">Jusqu'à expiration définie par la commune</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Événements SOS</td>
              <td className="py-1.5">6 mois (journalisation sécurité)</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Contacts de confiance</td>
              <td className="py-1.5">Jusqu'à suppression manuelle ou du compte</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Abonnements push</td>
              <td className="py-1.5">Jusqu'à révocation ou expiration (auto-nettoyage)</td>
            </tr>
            <tr className="text-foreground/80">
              <td className="py-1.5 pr-3">Logs techniques (IP)</td>
              <td className="py-1.5">1 an (obligation légale LCEN)</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="5. Destinataires des données">
        <p>
          Vos données sont accessibles aux personnes suivantes, dans la limite de leurs attributions :
        </p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-foreground/80">
          <li>
            <strong>Modérateurs de votre commune</strong> — voient les signalements publiés dans
            leur périmètre (pseudonyme uniquement, pas d'email ni de coordonnées GPS exactes)
          </li>
          <li>
            <strong>Supabase Inc.</strong> — sous-traitant technique (stockage, authentification),
            DPA en place, hébergement UE
          </li>
          <li>
            <strong>Vercel Inc.</strong> — sous-traitant technique (déploiement applicatif), DPA en
            place, données en transit uniquement
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground text-xs">
          Aucune donnée n'est vendue ou transmise à des tiers à des fins commerciales.
        </p>
      </Section>

      <Section title="6. Transferts hors UE">
        <p>
          Vercel Inc. (États-Unis) et Supabase Inc. (Singapour / AWS UE) sont couverts par
          des clauses contractuelles types (CCT / SCC) conformes à l'article 46 du RGPD.
          Les données sont physiquement stockées dans la région AWS <strong>eu-west-1</strong> (Irlande).
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-foreground/80">
          <li><strong>Accès</strong> — obtenir une copie de vos données</li>
          <li><strong>Rectification</strong> — corriger des données inexactes</li>
          <li><strong>Effacement</strong> — demander la suppression de vos données (« droit à l'oubli »)</li>
          <li><strong>Opposition</strong> — vous opposer à certains traitements fondés sur l'intérêt légitime</li>
          <li><strong>Limitation</strong> — restreindre temporairement un traitement</li>
          <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré</li>
          <li><strong>Retrait du consentement</strong> — à tout moment pour les traitements fondés sur le consentement</li>
        </ul>
        <p className="mt-2 text-sm">
          Pour exercer vos droits : {" "}
          <a href="mailto:privacy@vigie-city.fr" className="text-primary underline">
            privacy@vigie-city.fr
          </a>
          {" "}— réponse sous 30 jours.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Vous pouvez également introduire une réclamation auprès de la{" "}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            className="text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            CNIL
          </a>
          .
        </p>
      </Section>

      <Section title="8. Sécurité des données">
        <p>
          VigieCity met en œuvre les mesures techniques et organisationnelles suivantes :
        </p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-foreground/80">
          <li>Chiffrement en transit (HTTPS/TLS 1.3)</li>
          <li>Chiffrement au repos (AES-256) via Supabase / AWS</li>
          <li>Row-Level Security (RLS) PostgreSQL — cloisonnement par commune</li>
          <li>Authentification sécurisée (Supabase Auth, JWT)</li>
          <li>Hachage SHA-256 des coordonnées GPS avant stockage</li>
          <li>Accès modérateur limité aux données de leur commune</li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          En cas de violation de données susceptible d'engendrer un risque pour vos droits,
          vous en serez informé conformément à l'article 34 du RGPD dans les meilleurs délais.
        </p>
      </Section>

      <Section title="9. Cookies et technologies similaires">
        <p>
          VigieCity n'utilise que des cookies techniques strictement nécessaires (session
          d'authentification, jeton JWT). Aucun cookie de traçage publicitaire n'est déposé.
          Ces cookies ne nécessitent pas de consentement préalable (directive ePrivacy, art. 5.3).
        </p>
      </Section>

      <Section title="10. Modifications">
        <p>
          Cette politique peut être mise à jour pour refléter les évolutions de la plateforme
          ou de la réglementation. La version en vigueur est toujours accessible depuis
          cette page. En cas de modification substantielle, vous en serez informé par email
          ou notification dans l'application.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Dernière mise à jour : juin 2025. Version 1.0.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ d, f, b }: { d: string; f: string; b: string }) {
  return (
    <tr className="text-foreground/80">
      <td className="py-1.5 pr-3">{d}</td>
      <td className="py-1.5 pr-3">{f}</td>
      <td className="py-1.5">{b}</td>
    </tr>
  );
}
