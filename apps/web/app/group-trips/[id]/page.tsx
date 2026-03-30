"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface GroupTrip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  pricePerPerson: number;
  seatsRemaining: number;
  program: unknown;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function GroupTripJoinPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [pax, setPax] = useState(1);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; totalPrice: number } | null>(null);
  const [error, setError] = useState("");

  const fetchTrip = () => {
    fetch(`${API}/api/v1/group-trips`)
      .then((r) => r.json())
      .then((trips: GroupTrip[]) => {
        const found = trips.find((t) => t.id === id);
        setTrip(found ?? null);
      })
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = localStorage.getItem("mwy_traveler_access_token") ?? "";
    setToken(stored);
    fetchTrip();

    // Real-time polling every 30 seconds (MVP requirement)
    const interval = setInterval(fetchTrip, 30_000);
    return () => clearInterval(interval);
  }, [id]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!token.trim()) {
      setError("Vous devez être connecté pour rejoindre un voyage.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/v1/group-trips/${id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ pax })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Erreur lors de la réservation.");
        return;
      }

      setResult({ id: data.id, totalPrice: data.totalPrice });
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement…</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Voyage introuvable.</p>
          <Link href="/group-trips" className="text-amber-600 hover:underline">
            Retour aux voyages de groupe
          </Link>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Réservation confirmée !</h1>
          <p className="text-gray-600 mb-1">Voyage : <strong>{trip.title}</strong></p>
          <p className="text-gray-600 mb-1">Nb places : <strong>{pax}</strong></p>
          <p className="text-gray-600 mb-6">
            Total : <strong className="text-amber-600">{result.totalPrice.toLocaleString("fr-FR")} MAD</strong>
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/group-trips" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition">
              Voir d&apos;autres voyages
            </Link>
            <Link href="/bookings/status" className="text-sm text-gray-500 hover:text-gray-700">
              Suivre mes réservations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/group-trips" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
          ← Tous les voyages de groupe
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-3" />
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{trip.title}</h1>
            <p className="text-amber-600 font-medium mb-4">📍 {trip.destination}</p>

            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
              <div>
                <span className="font-medium text-gray-700">Départ</span>
                <br />{formatDate(trip.startDate)}
              </div>
              <div>
                <span className="font-medium text-gray-700">Retour</span>
                <br />{formatDate(trip.endDate)}
              </div>
              <div>
                <span className="font-medium text-gray-700">Places restantes</span>
                <br />
                <span className={trip.seatsRemaining > 0 ? "text-green-600" : "text-red-500"}>
                  {trip.seatsRemaining}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Prix / pers.</span>
                <br />
                <span className="font-bold text-gray-900">{trip.pricePerPerson.toLocaleString("fr-FR")} MAD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Rejoindre ce voyage</h2>

          {!token && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Vous n&apos;êtes pas connecté.{" "}
              <Link href="/auth/login" className="font-medium underline">
                Se connecter
              </Link>{" "}
              ou{" "}
              <Link href="/auth/register" className="font-medium underline">
                créer un compte
              </Link>
              .
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token JWT
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJ..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de places
              </label>
              <input
                type="number"
                min={1}
                max={trip.seatsRemaining}
                value={pax}
                onChange={(e) => setPax(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {pax > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Total estimé : {(trip.pricePerPerson * pax).toLocaleString("fr-FR")} MAD
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || trip.seatsRemaining === 0}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {submitting ? "Réservation en cours…" : "Confirmer la réservation"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
