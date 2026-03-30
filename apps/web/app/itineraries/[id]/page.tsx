"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Itinerary {
  id: string;
  title: string;
  status: "DRAFT" | "VALIDATED";
  totalPrice: number;
  days: unknown;
  intakeForm: Record<string, string>;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ItineraryPage() {
  const params = useParams();
  const id = params.id as string;

  const [token, setToken] = useState("");
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mwy_traveler_access_token") ?? "";
    setToken(stored);
  }, []);

  useEffect(() => {
    if (loading === false) return; // already fetched

    if (token) {
      // Authenticated — fetch private itinerary with full details
      fetch(`${API}/api/v1/itineraries/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async (res) => {
          if (!res.ok) {
            // Fallback to public endpoint on auth failure
            return fetch(`${API}/api/v1/itineraries/public/${id}`);
          }
          return res;
        })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            setError(data.message ?? "Erreur lors du chargement.");
            return;
          }
          const data = await res.json();
          setItinerary(data);
        })
        .catch(() => setError("Impossible de joindre le serveur."))
        .finally(() => setLoading(false));
    } else {
      // Not logged in — use public (read-only) endpoint
      fetch(`${API}/api/v1/itineraries/public/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            setError(data.message ?? "Itinéraire introuvable.");
            return;
          }
          const data = await res.json();
          setItinerary(data);
        })
        .catch(() => setError("Impossible de joindre le serveur."))
        .finally(() => setLoading(false));
    }
  }, [id, token]);

  async function handleValidate() {
    setValidating(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/v1/itineraries/${id}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Erreur lors de la validation.");
        return;
      }

      setItinerary(data);
      setValidated(true);
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setValidating(false);
    }
  }

  if (!token && !loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Connectez-vous pour voir votre itinéraire.</p>
          <Link href="/auth/login" className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement…</p>
      </main>
    );
  }

  if (!itinerary) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-2">{error || "Itinéraire introuvable."}</p>
          <Link href="/itineraries/new" className="text-amber-600 hover:underline text-sm">
            Créer un nouvel itinéraire
          </Link>
        </div>
      </main>
    );
  }

  const intakeEntries = Object.entries(itinerary.intakeForm).filter(([, v]) => v);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/itineraries/new" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
          ← Nouvel itinéraire
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div
            className={`h-3 ${
              itinerary.status === "VALIDATED"
                ? "bg-gradient-to-r from-green-400 to-emerald-500"
                : "bg-gradient-to-r from-amber-400 to-orange-400"
            }`}
          />
          <div className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{itinerary.title}</h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                  itinerary.status === "VALIDATED"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {itinerary.status === "VALIDATED" ? "✅ Validé" : "📝 Brouillon"}
              </span>
            </div>

            <div className="text-sm text-gray-500 mb-4">
              Créé le {new Date(itinerary.createdAt).toLocaleDateString("fr-FR")}
            </div>

            {itinerary.totalPrice > 0 && (
              <p className="text-xl font-bold text-gray-900 mb-4">
                {itinerary.totalPrice.toLocaleString("fr-FR")} MAD
              </p>
            )}

            {intakeEntries.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Formulaire de préparation</p>
                <dl className="space-y-2">
                  {intakeEntries.map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-sm">
                      <dt className="text-gray-500 capitalize min-w-[100px]">{key}</dt>
                      <dd className="text-gray-800">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {validated && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm mb-4">
            🎉 Votre itinéraire a été validé avec succès ! Notre équipe vous contactera sous peu.
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>
        )}

        {itinerary.status === "DRAFT" && !validated && (
          <button
            onClick={handleValidate}
            disabled={validating}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {validating ? "Validation en cours…" : "✅ Valider mon itinéraire"}
          </button>
        )}

        <div className="mt-4 flex gap-3">
          <Link
            href="/group-trips"
            className="flex-1 text-center bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-2.5 rounded-xl text-sm transition"
          >
            Voir les voyages de groupe
          </Link>
          <Link
            href="/itineraries/new"
            className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition"
          >
            Nouvel itinéraire
          </Link>
        </div>
      </div>
    </main>
  );
}
