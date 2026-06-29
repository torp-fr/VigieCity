import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PlatformShell } from "@/components/PlatformShell";
import { useAppAuth } from "@/hooks/useAppAuth";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/platform/city/moderation")({
  beforeLoad: ({ context }) => {
    // Protected: city admins only (or super-admin)
    if (!context.authRole || (context.authRole !== "city_admin" && context.authRole !== "super_admin")) {
      throw new Error("Unauthorized");
    }
  },
  component: CityModerationPage,
});

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  citizen_name: string;
  status: "pending" | "filtered" | "responded" | "resolved";
  auto_filter_score: number;
  city_response?: string;
  created_at: string;
  responded_at?: string;
}

function CityModerationPage() {
  const router = useRouter();
  const { user } = useAppAuth();
  const { municipality_id } = usePlatformAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch reports for city
  useEffect(() => {
    const fetchReports = async () => {
      if (!municipality_id) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/city/reports?municipality_id=${municipality_id}&status=${filter !== "all" ? filter : ""}`);
        if (!response.ok) throw new Error("Failed to fetch reports");
        const data = await response.json();
        setReports(data.reports || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [municipality_id, filter]);

  const handleRespond = async (reportId: string) => {
    if (!responseText.trim()) {
      alert("Veuillez écrire une réponse");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/city/reports/${reportId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_text: responseText,
          publish_to_citizen: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit response");

      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: "responded", city_response: responseText, responded_at: new Date().toISOString() }
            : r
        )
      );
      setSelectedReport(null);
      setResponseText("");
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Erreur lors de l'envoi de la réponse");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlatformShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Modération des Signalements</h1>

        {/* Filter tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {(["all", "pending", "responded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium border-b-2 ${
                filter === f ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
              }`}
            >
              {f === "all" ? "Tous" : f === "pending" ? "En attente" : "Répondus"}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : reports.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center text-gray-500">
            Aucun signalement pour le moment
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{report.title}</h3>
                    <p className="text-sm text-gray-600">{report.category}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Par {report.citizen_name} • {new Date(report.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === "filtered" && (
                      <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                        <AlertCircle size={14} />
                        Filtré
                      </div>
                    )}
                    {report.status === "pending" && (
                      <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        <Clock size={14} />
                        En attente
                      </div>
                    )}
                    {report.status === "responded" && (
                      <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        <CheckCircle size={14} />
                        Répondu
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Respond to report */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">{selectedReport.title}</h2>
              <p className="text-gray-700 mb-4">{selectedReport.description}</p>

              {selectedReport.city_response && (
                <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                  <p className="text-sm font-medium text-green-800">Votre réponse:</p>
                  <p className="text-green-900 mt-1">{selectedReport.city_response}</p>
                </div>
              )}

              {selectedReport.status !== "responded" && (
                <div className="space-y-4">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Écrivez votre réponse aux citoyens..."
                    className="w-full h-32 p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(selectedReport.id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? "Envoi..." : "Envoyer la réponse"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(null);
                        setResponseText("");
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
