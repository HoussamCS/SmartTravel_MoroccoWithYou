"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Service {
  id: string;
  label: string;
  pricePublic: number;
  commissionAmount: number;
  unit: "PER_PERSON" | "FLAT";
  provider?: { name: string; city: string };
}

interface DayItem {
  serviceId: string;
  label: string;
  time?: string;
  notes?: string;
  price: number;
}

interface ItineraryDay {
  dayNumber: number;
  date?: string;
  items: DayItem[];
}

interface Itinerary {
  id: string;
  title: string;
  status: string;
  totalPrice: number;
  days: ItineraryDay[];
  intakeForm: Record<string, string>;
  user: { email: string };
}

interface Provider {
  id: string;
  name: string;
  city: string;
  services: Service[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AdminItineraryBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [numDays, setNumDays] = useState(3);
  const [addingDayItem, setAddingDayItem] = useState<{ dayIndex: number; serviceId: string; time: string; notes: string } | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("mwy_admin_token") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/api/v1/admin/itineraries/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/api/v1/providers?pageSize=50`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([itData, provData]) => {
        setItinerary(itData);
        const rawDays: ItineraryDay[] = Array.isArray(itData.days) && itData.days.length > 0
          ? itData.days
          : Array.from({ length: numDays }, (_, i) => ({ dayNumber: i + 1, items: [] }));
        setDays(rawDays);
        setNumDays(rawDays.length);

        // For each provider, load its services
        const provs = (provData.data ?? []) as Provider[];
        // Load services for each provider
        Promise.all(
          provs.map((p: Provider) =>
            fetch(`${API}/api/v1/providers/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((r) => r.json())
          )
        ).then((fullProviders) => setProviders(fullProviders));
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const addDay = () => {
    setDays((prev) => [...prev, { dayNumber: prev.length + 1, items: [] }]);
    setNumDays((n) => n + 1);
  };

  const removeDay = (dayIndex: number) => {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex).map((d, i) => ({ ...d, dayNumber: i + 1 })));
    setNumDays((n) => n - 1);
  };

  const addItem = (dayIndex: number, serviceId: string, time: string, notes: string) => {
    // find service details
    let found: Service | undefined;
    let providerName = "";
    for (const p of providers) {
      const s = p.services?.find((sv) => sv.id === serviceId);
      if (s) { found = s; providerName = p.name; break; }
    }
    if (!found) return;

    const item: DayItem = {
      serviceId,
      label: `${found.label} — ${providerName}`,
      time: time || undefined,
      notes: notes || undefined,
      price: found.pricePublic,
    };

    setDays((prev) =>
      prev.map((d, i) => i === dayIndex ? { ...d, items: [...d.items, item] } : d)
    );
    setAddingDayItem(null);
  };

  const removeItem = (dayIndex: number, itemIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) } : d
      )
    );
  };

  const computeTotal = useCallback(() => days.reduce((sum, d) => sum + d.items.reduce((s, it) => s + it.price, 0), 0), [days]);

  const save = async (newStatus?: string) => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body: Record<string, unknown> = { days, totalPrice: computeTotal() };
      if (newStatus) body.status = newStatus;

      const res = await fetch(`${API}/api/v1/admin/itineraries/${id}/days`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? "Erreur lors de la sauvegarde.");
        return;
      }

      const updated = await res.json();
      setItinerary((prev) => (prev ? { ...prev, status: updated.status, totalPrice: updated.totalPrice } : prev));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <p className="text-gray-600 mb-2">Token admin manquant.</p>
        <input
          placeholder="Coller votre token admin ici"
          className="border px-3 py-2 rounded-lg text-sm font-mono w-full"
          onChange={(e) => { localStorage.setItem("mwy_admin_token", e.target.value); setToken(e.target.value); }}
        />
      </main>
    );
  }

  if (loading) return <main className="p-8"><p className="text-gray-400">Chargement…</p></main>;
  if (!itinerary) return <main className="p-8"><p className="text-red-500">Itinéraire introuvable.</p></main>;

  const totalComputed = computeTotal();

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/itineraries" className="text-sm text-amber-600 hover:underline">← Retour</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{itinerary.title}</h1>
        <span className="text-sm text-gray-500">Client: {itinerary.user?.email}</span>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          itinerary.status === "VALIDATED" ? "bg-green-100 text-green-700" :
          itinerary.status === "BOOKED" ? "bg-amber-100 text-amber-700" :
          itinerary.status === "SENT" ? "bg-blue-100 text-blue-700" :
          "bg-gray-100 text-gray-600"
        }`}>{itinerary.status}</span>
      </div>

      {/* Intake form summary */}
      {Object.keys(itinerary.intakeForm ?? {}).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm">
          <p className="font-semibold text-amber-800 mb-2">Formulaire client</p>
          <dl className="grid grid-cols-2 gap-1">
            {Object.entries(itinerary.intakeForm).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-amber-700 capitalize">{k}:</dt>
                <dd className="text-gray-800">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Days builder */}
      <div className="space-y-4 mb-6">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Jour {day.dayNumber}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingDayItem({ dayIndex, serviceId: "", time: "", notes: "" })}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition"
                >
                  + Ajouter service
                </button>
                <button
                  onClick={() => removeDay(dayIndex)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5"
                >
                  Supprimer jour
                </button>
              </div>
            </div>

            {/* Add service panel */}
            {addingDayItem?.dayIndex === dayIndex && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-sm font-medium text-amber-800 mb-2">Choisir un service à ajouter</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={addingDayItem.serviceId}
                    onChange={(e) => setAddingDayItem((prev) => prev ? { ...prev, serviceId: e.target.value } : prev)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2"
                  >
                    <option value="">-- Choisir un service --</option>
                    {providers.map((p) =>
                      (p.services ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {p.name} — {s.label} ({s.pricePublic} MAD)
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    type="time"
                    value={addingDayItem.time}
                    onChange={(e) => setAddingDayItem((prev) => prev ? { ...prev, time: e.target.value } : prev)}
                    placeholder="Heure (optionnel)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={addingDayItem.notes}
                    onChange={(e) => setAddingDayItem((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                    placeholder="Notes (optionnel)"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    disabled={!addingDayItem.serviceId}
                    onClick={() => addItem(dayIndex, addingDayItem.serviceId, addingDayItem.time, addingDayItem.notes)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition"
                  >
                    Confirmer
                  </button>
                  <button onClick={() => setAddingDayItem(null)} className="px-4 py-1.5 text-gray-500 hover:text-gray-700 text-sm">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Items list */}
            {day.items.length === 0 ? (
              <p className="px-5 py-4 text-gray-400 text-sm">Aucun service pour ce jour.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {day.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{item.label}</span>
                      {item.time && <span className="ml-2 text-gray-400 text-xs">@ {item.time}</span>}
                      {item.notes && <p className="text-gray-400 text-xs mt-0.5">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-700">{Number(item.price).toLocaleString("fr-FR")} MAD</span>
                      <button
                        onClick={() => removeItem(dayIndex, itemIndex)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addDay}
        className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-2xl text-gray-400 hover:text-amber-600 transition text-sm font-medium mb-6"
      >
        + Ajouter un jour
      </button>

      {/* Total & save */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Prix total calculé</p>
          <p className="text-2xl font-black text-gray-900">{totalComputed.toLocaleString("fr-FR")} MAD</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => save("SENT")}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition"
          >
            {saving ? "…" : "Envoyer au client"}
          </button>
          <button
            onClick={() => save()}
            disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {saved && <p className="text-green-600 text-sm mt-3">✓ Itinéraire sauvegardé avec succès.</p>}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </main>
  );
}
