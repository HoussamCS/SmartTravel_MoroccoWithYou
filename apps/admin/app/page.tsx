import Link from "next/link";

// Admin dashboard
// Minor change 3
const cards = [
  { title: "Prestataires", metric: "CRUD", hint: "gestion catalogue", href: "/providers" },
  { title: "Itinéraires", metric: "Builder", hint: "planification voyages sur mesure", href: "/itineraries" },
  { title: "Utilisateurs", metric: "Gestion", hint: "liste, suspension, historique", href: "/users" },
  { title: "Commissions", metric: "Rapports", hint: "jobs BullMQ", href: "/commissions" },
  { title: "Voyages de groupe", metric: "CRUD", hint: "gestion des départs", href: "/group-trips" },
  { title: "Demandes Spéciales", metric: "Inbox", hint: "event requests", href: "/event-requests" },
];

export default function AdminPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <h1>Back-office Morocco With You</h1>
        <p>Pilotage fournisseurs, itineraires, commissions et voyages de groupe.</p>
      </header>

      <section className="admin-grid">
        {cards.map((card) => (
          <article key={card.title} className="admin-card">
            <h2>{card.title}</h2>
            <p className="metric">{card.metric}</p>
            <small>{card.hint}</small>
            <Link href={card.href}>Ouvrir</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
