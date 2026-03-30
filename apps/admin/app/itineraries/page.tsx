"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ItineraryRow {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "VALIDATED" | "BOOKED";
  totalPrice: number;
  updatedAt: string;
  user: { email: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  VALIDATED: "bg-green-100 text-green-700",
  BOOKED: "bg-amber-100 text-amber-700",
};

export default function AdminItinerariesPage() {
  const [rows, setRows] = useState<ItineraryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("mwy_admin_token") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);

    fetch(`${API}/api/v1/admin/itineraries?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [token, status, page]);

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Itinéraires</h1>
        <span className="text-sm text-gray-500">{total} itinéraires</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {["", "DRAFT", "SENT", "VALIDATED", "BOOKED"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              status === s ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-400"
            }`}
          >
            {s || "Tous"}
          </button>
        ))}
      </div>

      {!token && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
          Token admin manquant.{" "}
          <input
            placeholder="Coller votre token admin ici"
            className="ml-2 border px-2 py-1 rounded text-gray-800 text-xs font-mono"
            onChange={(e) => {
              localStorage.setItem("mwy_admin_token", e.target.value);
              setToken(e.target.value);
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun itinéraire trouvé.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Titre</th>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="text-right px-5 py-3">Prix total</th>
                <th className="text-left px-5 py-3">Mis à jour</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-amber-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.title}</td>
                  <td className="px-5 py-3 text-gray-500">{row.user?.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {row.totalPrice.toLocaleString("fr-FR")} MAD
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(row.updatedAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/itineraries/${row.id}`}
                      className="text-amber-600 hover:text-amber-700 font-medium text-xs"
                    >
                      Éditer →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </main>
  );
}
