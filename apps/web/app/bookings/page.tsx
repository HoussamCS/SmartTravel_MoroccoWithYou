"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  date: string;
  pax: number;
  totalPrice: number;
  paymentIntent?: string | null;
  serviceLabel: string;
  providerName: string;
};

type BookingListResponse = {
  page: number;
  pageSize: number;
  total: number;
  data: BookingRow[];
};

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

export default function BookingsListPage() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<BookingRow[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(travelerTokenKey) ?? "";
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${apiBase}/bookings?page=1&pageSize=20`, {
          headers: {
            authorization: `Bearer ${token}`
          }
        });

        const data = (await response.json()) as BookingListResponse | { message?: string };
        if (!response.ok) {
          throw new Error((data as { message?: string }).message ?? "Impossible de charger vos reservations.");
        }

        if (!cancelled) {
          setRows((data as BookingListResponse).data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [apiBase, token]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <span className="text-atlas">Mes reservations</span>
      </div>

      <section className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
          Espace voyageur
        </p>
        <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">Retrouvez toutes vos reservations</h1>
        <p className="mt-4 text-sm leading-7 text-white/85">
          Ouvrez un booking pour verifier son statut detaille, son paiement Stripe et suivre son traitement.
        </p>
      </section>

      {!token ? (
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm">
          <h2 className="text-2xl font-black text-atlas">Connexion requise</h2>
          <p className="mt-2 text-sm text-slate-700">
            Connectez-vous pour charger automatiquement vos reservations.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/auth/login" className="rounded-full bg-atlas px-5 py-3 text-sm font-semibold text-white">
              Se connecter
            </Link>
            <Link href="/auth/register" className="rounded-full border border-atlas px-5 py-3 text-sm font-semibold text-atlas">
              Creer un compte
            </Link>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm">
          <p className="text-sm text-slate-600">Chargement des reservations...</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="mt-6 rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </section>
      ) : null}

      {!loading && !error && token ? (
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-sm md:p-6">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-700">Aucune reservation trouvee pour ce compte.</p>
              <Link href="/experiences" className="mt-4 inline-block rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white">
                Explorer les experiences
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{row.providerName}</p>
                      <h2 className="mt-1 text-lg font-black text-atlas">{row.serviceLabel}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(row.date).toLocaleDateString("fr-MA")} • {row.pax} pers.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(row.totalPrice)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Statut: {row.status}</p>
                      <Link
                        href={`/bookings/status?bookingId=${row.id}`}
                        className="mt-3 inline-block rounded-full bg-atlas px-4 py-2 text-xs font-semibold text-white"
                      >
                        Voir le detail
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
