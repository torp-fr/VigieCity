/**
 * ConsultationsWidget — Citizen consultations & voting
 * J8.3 — Consultations Citoyennes
 */

import { useEffect, useState } from "react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Check, BarChart3, Loader2 } from "lucide-react";

export interface Consultation {
  id: string;
  title: string;
  description: string;
  ends_at: string;
  status: "active" | "closed" | "archived";
}

interface Question {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "open_text";
  options: Array<{
    id: string;
    option_text: string;
    vote_count: number;
  }>;
}

export function ConsultationsWidget() {
  const { supabase, collectivity_id } = useAppAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !collectivity_id) return;

    const fetchConsultations = async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("collectivity_id", collectivity_id)
        .eq("is_published", true)
        .order("ends_at", { ascending: false });

      if (!error) {
        setConsultations(data ?? []);
      }
      setLoading(false);
    };

    fetchConsultations();
  }, [supabase, collectivity_id]);

  if (loading) {
    return <div className="space-y-3">
      {[1, 2].map(i => (
        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>;
  }

  if (!consultations.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">Aucune consultation active</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {consultations.map((consultation) => (
        <button
          key={consultation.id}
          onClick={() => setSelectedConsultation(consultation.id)}
          className="w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold">{consultation.title}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {consultation.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {consultation.status === "active" ? "🟢 En cours" : "🔴 Fermé"}
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground ml-2 flex-shrink-0" />
          </div>
        </button>
      ))}

      {selectedConsultation && (
        <ConsultationDetail
          consultation_id={selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </div>
  );
}

function ConsultationDetail({
  consultation_id,
  onClose
}: {
  consultation_id: string
  onClose: () => void
}) {
  const { supabase } = useAppAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from("consultation_questions")
        .select(`
          id,
          question_text,
          question_type,
          consultation_options(id, option_text, vote_count)
        `)
        .eq("consultation_id", consultation_id)
        .order("position");

      if (!error && data) {
        const formatted = data.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.consultation_options || [],
        }));
        setQuestions(formatted);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [supabase, consultation_id]);

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-lg w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Consultation</h3>
          <button onClick={onClose} className="text-2xl text-muted-foreground">×</button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="font-semibold">Merci pour votre participation!</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground w-full"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <p className="font-medium text-sm">{q.question_text}</p>
                {q.options.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type={q.question_type === "multiple_choice" ? "checkbox" : "radio"}
                      name={q.id}
                      value={opt.id}
                      className="rounded"
                    />
                    <span className="text-sm">{opt.option_text}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {opt.vote_count} votes
                    </span>
                  </label>
                ))}
              </div>
            ))}
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium mt-6"
            >
              Valider
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
