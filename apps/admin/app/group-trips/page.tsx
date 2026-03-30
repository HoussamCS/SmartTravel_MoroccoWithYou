import { fetchAdminGroupTrips } from "../../lib/api";
import { createGroupTripAction, deleteGroupTripAction, updateGroupTripAction } from "./actions";

const formatDateInput = (iso: string): string => {
  if (!iso) {
    return "";
  }

  return new Date(iso).toISOString().slice(0, 10);
};

export default async function GroupTripsAdminPage() {
  const trips = await fetchAdminGroupTrips();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <h1>Gestion des voyages de groupe</h1>
        <p>Creer, modifier et supprimer les voyages publics pour les inscriptions voyageurs.</p>
      </header>

      <section className="admin-card">
        <h2>Nouveau voyage</h2>
        <form action={createGroupTripAction} className="grid-form">
          <input name="title" placeholder="Titre" required />
          <input name="destination" placeholder="Destination" required />
          <input name="startDate" type="date" required />
          <input name="endDate" type="date" required />
          <input name="maxCapacity" type="number" min={1} defaultValue={12} required />
          <input name="pricePerPerson" type="number" min={1} step="0.01" defaultValue={1200} required />
          <button type="submit">Ajouter</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Voyages existants</h2>
        <div className="provider-list">
          {trips.map((trip) => (
            <article key={trip.id} className="provider-item">
              <form action={updateGroupTripAction} className="grid-form compact">
                <input type="hidden" name="id" defaultValue={trip.id} />
                <input name="title" defaultValue={trip.title} required />
                <input name="destination" defaultValue={trip.destination} required />
                <input name="startDate" type="date" defaultValue={formatDateInput(trip.startDate)} required />
                <input name="endDate" type="date" defaultValue={formatDateInput(trip.endDate)} required />
                <input name="maxCapacity" type="number" min={1} defaultValue={trip.maxCapacity} required />
                <input name="pricePerPerson" type="number" min={1} step="0.01" defaultValue={trip.pricePerPerson} required />
                <button type="submit">Mettre a jour</button>
              </form>

              <p style={{ marginTop: 10, color: "#5f6880", fontSize: 13 }}>
                Places restantes: <strong>{trip.seatsRemaining}</strong>
              </p>

              <form action={deleteGroupTripAction}>
                <input type="hidden" name="id" defaultValue={trip.id} />
                <button type="submit" className="danger">
                  Supprimer
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
