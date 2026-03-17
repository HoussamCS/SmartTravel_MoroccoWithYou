import { fetchCommissions, fetchJobLogs } from "../../lib/api";
import { queueCommissionReportAction, scheduleCommissionReportAction } from "./actions";

const monthDefault = new Date().toISOString().slice(0, 7);

export default async function CommissionsPage() {
  const [rows, logs] = await Promise.all([fetchCommissions(), fetchJobLogs()]);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <h1>Commissions & Rapports</h1>
        <p>Vue agrégée des commissions et pilotage des jobs BullMQ.</p>
      </header>

      <section className="admin-card">
        <h2>Lancer un rapport mensuel</h2>
        <form action={queueCommissionReportAction} className="grid-form compact">
          <input name="month" defaultValue={monthDefault} placeholder="YYYY-MM" required />
          <input name="providerId" placeholder="Provider UUID (optionnel)" />
          <button type="submit">Queue maintenant</button>
        </form>

        <form action={scheduleCommissionReportAction} className="grid-form compact">
          <input name="providerId" placeholder="Provider UUID (optionnel)" />
          <button type="submit">Programmer prochain mois</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Commissions par prestataire</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider ID</th>
                <th>Nom</th>
                <th>Total commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.providerId}>
                  <td>{row.providerId}</td>
                  <td>{row.providerName}</td>
                  <td>{row.commissionTotal.toFixed(2)} MAD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Historique jobs</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Job</th>
                <th>Status</th>
                <th>Date</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.queueName}</td>
                  <td>{log.jobName}</td>
                  <td>{log.status}</td>
                  <td>{new Date(log.processedAt).toLocaleString()}</td>
                  <td>{log.error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
