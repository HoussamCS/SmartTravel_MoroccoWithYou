"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const INTAKE_QUESTIONS = [
  { key: "budget", label: "Budget total estimé (MAD)", placeholder: "Ex : 5000" },
  { key: "duree", label: "Durée souhaitée (jours)", placeholder: "Ex : 7" },
  { key: "villes", label: "Villes / régions souhaitées", placeholder: "Ex : Marrakech, Sahara, Côte atlantique" },
  { key: "style", label: "Style de voyage", placeholder: "Ex : Culturel, Adventure, Détente…" },
  { key: "remarques", label: "Remarques ou demandes spéciales", placeholder: "Ex : Régime alimentaire, accessibilité…" }
];

export default function NewItineraryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("mwy_traveler_access_token") ?? "";
    setToken(stored);
  }, []);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("Vous devez être connecté pour créer un itinéraire.");
      return;
    }

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API}/api/v1/itineraries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ title: title.trim(), intakeForm: answers })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Erreur lors de la création.");
        return;
      }

      router.push(`/itineraries/${data.id}`);
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
          ← Accueil
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer mon itinéraire</h1>
        <p className="text-gray-500 mb-8">
          Décrivez votre voyage idéal et notre équipe préparera un programme sur mesure.
        </p>

        {!token && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Vous n&apos;êtes pas connecté.{" "}
            <Link href="/auth/login" className="font-medium underline">Se connecter</Link>{" "}
            ou{" "}
            <Link href="/auth/register" className="font-medium underline">créer un compte</Link>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token JWT (auto-rempli si connecté)
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
              Titre de l&apos;itinéraire <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Voyage romantique au Maroc en avril"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-medium text-gray-700">Formulaire de préparation</p>

          {INTAKE_QUESTIONS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                value={answers[key] ?? ""}
                onChange={(e) => setAnswer(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {submitting ? "Création en cours…" : "Créer mon itinéraire"}
          </button>
        </form>
      </div>
    </main>
  );
}
