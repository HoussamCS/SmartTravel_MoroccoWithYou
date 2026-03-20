import Link from "next/link";

interface GroupTrip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  pricePerPerson: number;
  seatsRemaining: number;
  program: unknown;
}

async function fetchGroupTrips(): Promise<GroupTrip[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/group-trips`, {
      cache: "no-store"
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export const metadata = { title: "Voyages de groupe — MoroccoWithYou" };

export default async function GroupTripsPage() {
  const trips = await fetchGroupTrips();

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voyages de groupe</h1>
        <p className="text-gray-500 mb-8">
          Partez avec d&apos;autres voyageurs sur des circuits soigneusement organisés au Maroc.
        </p>

        {trips.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-lg">Aucun voyage de groupe disponible pour le moment.</p>
            <Link href="/" className="mt-4 inline-block text-amber-600 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {trips.map((trip) => (
            <article
              key={trip.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-3" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">{trip.title}</h2>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      trip.seatsRemaining > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {trip.seatsRemaining > 0 ? `${trip.seatsRemaining} place(s)` : "Complet"}
                  </span>
                </div>

                <p className="text-amber-600 font-medium mb-1">📍 {trip.destination}</p>

                <div className="text-sm text-gray-500 space-y-1 mb-4">
                  <p>
                    🗓 {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                  </p>
                  <p>👥 Capacité : {trip.maxCapacity} personnes</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    {trip.pricePerPerson.toLocaleString("fr-FR")} MAD
                    <span className="text-sm font-normal text-gray-500"> / pers.</span>
                  </p>

                  {trip.seatsRemaining > 0 ? (
                    <Link
                      href={`/group-trips/${trip.id}`}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                    >
                      Rejoindre
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Complet</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
