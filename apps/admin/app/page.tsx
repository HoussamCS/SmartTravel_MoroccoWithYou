import Link from "next/link";

const cards = [
  { title: "Prestataires", metric: "CRUD", hint: "gestion catalogue", href: "/providers" },
  { title: "Reservations", metric: "Paiement", hint: "status webhook stripe", href: "/commissions" },
  { title: "Commissions", metric: "Rapports", hint: "jobs BullMQ", href: "/commissions" },
  { title: "Demandes Speciales", metric: "Inbox", hint: "event requests", href: "/event-requests" }
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
