import { fetchEventRequests } from "../../lib/api";

export default async function EventRequestsPage() {
  const requests = await fetchEventRequests();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <h1>Demandes Speciales</h1>
        <p>Suivi des formulaires evenements soumis par les voyageurs.</p>
      </header>

      <section className="admin-card">
        <h2>Dernieres demandes</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Budget</th>
                <th>Nb personnes</th>
                <th>Contact</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.eventType}</td>
                  <td>{new Date(request.date).toLocaleDateString()}</td>
                  <td>{request.budget ? `${request.budget.toFixed(2)} MAD` : "-"}</td>
                  <td>{request.peopleCount}</td>
                  <td>{request.requesterName ?? "-"} / {request.requesterMail ?? "-"}</td>
                  <td>{request.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
