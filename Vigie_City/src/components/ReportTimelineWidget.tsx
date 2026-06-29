/**
 * ReportTimelineWidget — Timeline visualizer for reports
 * J8.6 — Timeline signalements
 */

import { useEffect, useState } from "react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { AlertCircle, MessageSquare, Clock } from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  created_at: string;
  actor_id?: string;
}

export function ReportTimelineWidget({ report_id }: { report_id: string }) {
  const { supabase } = useAppAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    const fetchTimeline = async () => {
      const [eventsRes, commentsRes] = await Promise.all([
        supabase
          .from("report_timeline_events")
          .select("*")
          .eq("report_id", report_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("report_timeline_comments")
          .select("*")
          .eq("report_id", report_id)
          .eq("is_internal", false)
          .eq("is_approved", true)
          .order("created_at", { ascending: false }),
      ]);

      if (!eventsRes.error) setEvents(eventsRes.data ?? []);
      if (!commentsRes.error) setComments(commentsRes.data ?? []);
      setLoading(false);
    };

    fetchTimeline();
  }, [supabase, report_id]);

  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded bg-muted animate-pulse" />
      ))}
    </div>;
  }

  const combined = [
    ...events.map(e => ({ ...e, type: 'event' })),
    ...comments.map(c => ({ ...c, type: 'comment', created_at: c.created_at }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      {combined.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
      ) : (
        <div className="space-y-3">
          {combined.map((item, idx) => (
            <div key={item.id} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${item.type === 'event' ? 'bg-primary' : 'bg-blue-400'}`} />
                {idx < combined.length - 1 && <div className="w-0.5 h-8 bg-border mt-1" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    {item.type === 'event' ? (
                      <>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">{item.text}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
