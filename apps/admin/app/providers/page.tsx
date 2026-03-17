import { fetchProviders } from "../../lib/api";
import { createProviderAction, deleteProviderAction, updateProviderAction } from "./actions";

const categories = ["RESTAURANT", "ACTIVITY", "TRANSPORT", "ACCOM", "EXCURSION"];

export default async function ProvidersPage() {
  const providers = await fetchProviders();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <h1>Gestion des prestataires</h1>
        <p>CRUD des prestataires avec activation, localisation et categorie.</p>
      </header>

      <section className="admin-card">
        <h2>Nouveau prestataire</h2>
        <form action={createProviderAction} className="grid-form">
          <input name="name" placeholder="Nom" required />
          <input name="city" placeholder="Ville" required />
          <select name="category" defaultValue="ACTIVITY">
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input name="description" placeholder="Description" required />
          <input name="lat" type="number" step="0.000001" placeholder="Latitude" required />
          <input name="lng" type="number" step="0.000001" placeholder="Longitude" required />
          <button type="submit">Ajouter</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Prestataires existants</h2>
        <div className="provider-list">
          {providers.map((provider) => (
            <article key={provider.id} className="provider-item">
              <form action={updateProviderAction} className="grid-form compact">
                <input type="hidden" name="id" defaultValue={provider.id} />
                <input name="name" defaultValue={provider.name} required />
                <input name="city" defaultValue={provider.city} required />
                <select name="category" defaultValue={provider.category}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input name="description" defaultValue={provider.description} required />
                <input name="lat" type="number" step="0.000001" defaultValue={provider.location.lat} required />
                <input name="lng" type="number" step="0.000001" defaultValue={provider.location.lng} required />
                <select name="isActive" defaultValue={provider.isActive ? "true" : "false"}>
                  <option value="true">Actif</option>
                  <option value="false">Suspendu</option>
                </select>
                <button type="submit">Mettre a jour</button>
              </form>

              <form action={deleteProviderAction}>
                <input type="hidden" name="id" defaultValue={provider.id} />
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
