"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  role: "TRAVELER" | "ADMIN";
  isSuspended: boolean;
  createdAt: string;
  _count: { bookings: number };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("mwy_admin_token") ?? "");
  }, []);

  const fetchUsers = () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (q) params.set("q", q);
    if (role) params.set("role", role);

    fetch(`${API}/api/v1/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, [token, page, role]);

  async function toggleSuspend(user: AdminUser) {
    setActing(user.id);
    try {
      const res = await fetch(`${API}/api/v1/admin/users/${user.id}/suspend`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspended: !user.isSuspended }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, isSuspended: updated.isSuspended } : u)));
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <span className="text-sm text-gray-500">{total} utilisateurs</span>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchUsers(); } }}
          placeholder="Rechercher par email…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Tous les rôles</option>
          <option value="TRAVELER">TRAVELER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button
          onClick={() => { setPage(1); fetchUsers(); }}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
        >
          Rechercher
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Rôle</th>
                <th className="text-right px-5 py-3">Réservations</th>
                <th className="text-left px-5 py-3">Inscrit le</th>
                <th className="text-center px-5 py-3">Statut</th>
                <th className="text-center px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className={`transition ${user.isSuspended ? "bg-red-50" : "hover:bg-amber-50"}`}>
                  <td className="px-5 py-3 font-medium text-gray-900">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{user._count.bookings}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {user.isSuspended ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspendu</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Actif</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      disabled={acting === user.id || user.role === "ADMIN"}
                      onClick={() => toggleSuspend(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${
                        user.isSuspended
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-red-100 hover:bg-red-200 text-red-700"
                      }`}
                    >
                      {acting === user.id ? "…" : user.isSuspended ? "Réactiver" : "Suspendre"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
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
            disabled={page * 25 >= total}
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
