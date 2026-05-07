import { createJourney } from '@/db/repositories/journey.repository';
import { getLocationByIata } from '@/db/repositories/location.repository';
import { getOperatorByCode } from '@/db/repositories/operator.repository';
import { searchVehicles } from '@/db/repositories/vehicle.repository';
import type { DrizzleDb } from '@/db/types';
import { haversineDistance } from '@/lib/geo';

const yesterdayIso = (now: Date = new Date()): string => {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface SeedExampleResult {
  status: 'created' | 'missing-airports';
  journeyId?: string;
  operatorAttached: boolean;
  vehicleAttached: boolean;
}

// Insert a canonical FRA → JFK example flight so a fresh user has something
// on the map / in stats / unlocking achievements without entering anything.
// Operator and vehicle are best-effort: if the seed-DB doesn't carry LH or an
// A350, the journey is still created with operatorId/vehicleId left null.
// Only a missing FRA *or* JFK is a hard failure — without either endpoint
// there is no valid journey to insert.
export async function seedExampleJourney(
  db: DrizzleDb,
  now: Date = new Date(),
): Promise<SeedExampleResult> {
  const [fra, jfk, lh, vehicles] = await Promise.all([
    getLocationByIata(db, 'FRA'),
    getLocationByIata(db, 'JFK'),
    getOperatorByCode(db, 'LH'),
    searchVehicles(db, 'A359', 'flight'),
  ]);

  if (!fra || !jfk) {
    return { status: 'missing-airports', operatorAttached: false, vehicleAttached: false };
  }

  const distanceKm =
    Math.round(
      haversineDistance(
        { latitude: fra.lat, longitude: fra.lng },
        { latitude: jfk.lat, longitude: jfk.lng },
      ) * 10,
    ) / 10;

  const journey = await createJourney(
    db,
    {
      mode: 'flight',
      fromLocationId: fra.id,
      toLocationId: jfk.id,
      date: yesterdayIso(now),
      serviceNumber: 'LH 400',
      operatorId: lh?.id ?? null,
      vehicleId: vehicles[0]?.id ?? null,
      cabinClass: 'business',
      distanceKm,
      durationMinutes: 540,
      routeType: 'great_circle',
      notes: 'Beispielreise — kannst du jederzeit löschen.',
      isManualEntry: true,
      source: 'onboarding:example',
    },
    { evaluateAchievements: true, notify: false, triggerInterstitial: false },
  );

  return {
    status: 'created',
    journeyId: journey.id,
    operatorAttached: Boolean(lh),
    vehicleAttached: Boolean(vehicles[0]),
  };
}
