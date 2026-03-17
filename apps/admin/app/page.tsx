const cards = [
  { title: "Prestataires", metric: "128", hint: "actifs" },
  { title: "Reservations", metric: "412", hint: "ce mois" },
  { title: "Commissions", metric: "94 300 MAD", hint: "estimation" },
  { title: "Voyages de groupe", metric: "6", hint: "ouverts" }
];

export default function AdminPage() {
  return (
    <main style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "8px" }}>Back-office Morocco With You</h1>
      <p style={{ color: "#576077", marginTop: 0 }}>Pilotage fournisseurs, itineraires, commissions et voyages de groupe.</p>

      <section
        style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}
      >
        {cards.map((card) => (
          <article
            key={card.title}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e4e7f0"
            }}
          >
            <h2 style={{ margin: 0, fontSize: "14px", color: "#576077" }}>{card.title}</h2>
            <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>{card.metric}</p>
            <small style={{ color: "#7a8499" }}>{card.hint}</small>
          </article>
        ))}
      </section>
    </main>
  );
}
