import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, ShieldCheck, Flame, HeartPulse, PhoneCall, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/urgences")({
  head: () => ({
    meta: [
      { title: "Numéros d'urgence — VigieCity" },
      {
        name: "description",
        content:
          "Police, gendarmerie, pompiers, SAMU et numéros locaux de votre commune en un seul tap.",
      },
      { property: "og:title", content: "Numéros d'urgence — VigieCity" },
      {
        property: "og:description",
        content: "Tous les numéros essentiels à portée de main.",
      },
    ],
  }),
  component: EmergencyDirectory,
});

function EmergencyDirectory() {
  const { data, isLoading } = useQuery({
    queryKey: ["emergency_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("is_national", { ascending: false })
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const nationals = data?.filter((c) => c.is_national) ?? [];
  const locals = data?.filter((c) => !c.is_national) ?? [];

  return (
    <div className="space-y-6 px-4 pt-5">
      <header>
        <h1 className="text-2xl font-bold">Numéros d'urgence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appuyez pour appeler directement.
        </p>
      </header>

      <Section title="Numéros nationaux">
        {isLoading ? (
          <Skeleton count={4} />
        ) : (
          nationals.map((c) => <ContactCard key={c.id} contact={c} highlight />)
        )}
      </Section>

      <Section title="Numéros de votre commune">
        {locals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
            Aucun numéro local n'a encore été ajouté par votre commune.
          </div>
        ) : (
          locals.map((c) => <ContactCard key={c.id} contact={c} />)
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

type Contact = {
  id: string;
  label: string;
  phone: string;
  description: string | null;
  hours: string | null;
  category?: string | null;
};

const CATEGORY_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  police:   { icon: ShieldCheck, color: "text-blue-700",    bg: "bg-blue-100"    },
  pompiers: { icon: Flame,       color: "text-red-600",     bg: "bg-red-100"     },
  medical:  { icon: HeartPulse,  color: "text-emerald-600", bg: "bg-emerald-100" },
  urgence:  { icon: PhoneCall,   color: "text-sos",         bg: "bg-sos/10"      },
  social:   { icon: HandHeart,   color: "text-violet-600",  bg: "bg-violet-100"  },
  mairie:   { icon: ShieldCheck, color: "text-primary",     bg: "bg-primary/10"  },
};

function CategoryIcon({ category, highlight }: { category: string; highlight?: boolean }) {
  const cfg = CATEGORY_ICON[category] ?? CATEGORY_ICON.urgence;
  const Icon = cfg.icon;
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${highlight ? "bg-white/20" : cfg.bg}`}>
      <Icon className={`h-5 w-5 ${highlight ? "text-white" : cfg.color}`} />
    </div>
  );
}

function ContactCard({ contact, highlight }: { contact: Contact; highlight?: boolean }) {
  return (
    <li>
      <a
        href={`tel:${contact.phone}`}
        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-card transition-transform active:scale-[0.98] ${
          highlight
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "border-border bg-card"
        }`}
      >
        <CategoryIcon category={contact.category ?? "urgence"} highlight={highlight} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{contact.label}</p>
          {contact.description && (
            <p
              className={`mt-0.5 truncate text-xs ${
                highlight ? "opacity-80" : "text-muted-foreground"
              }`}
            >
              {contact.description}
            </p>
          )}
          {contact.hours && (
            <p
              className={`mt-0.5 truncate text-xs ${
                highlight ? "opacity-70" : "text-muted-foreground"
              }`}
            >
              🕒 {contact.hours}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-lg font-bold tabular-nums">
          {contact.phone}
          <Phone className="h-5 w-5" />
        </div>
      </a>
    </li>
  );
}

function Skeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
      ))}
    </>
  );
}
