// Pure factory for the `journeys` row that the AddJourney forms write.
// Lives in lib/ so vitest can import it without dragging React Native
// into the test environment, and so the forms and the duration tests
// share a single source of truth (otherwise the test silently drifts
// from production — the bug pattern from Codex Cross-Audit v2).

import type {
  FlightFormValues,
  OtherFormValues,
  OtherSubmode,
  TrainFormValues,
} from '@/lib/forms/journeySchemas';
import { computeDurationMinutes } from '@/lib/journeys/duration';

interface JourneyPatchBase {
  fromLocationId: string;
  toLocationId: string;
  date: string;
  startTimeLocal: string | null;
  endTimeLocal: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  notes: string | null;
  isManualEntry: true;
}

export interface FlightJourneyPatch extends JourneyPatchBase {
  mode: 'flight';
  operatorId: string | null;
  vehicleId: string | null;
  serviceNumber: string | null;
  seatNumber: string | null;
  cabinClass: FlightFormValues['cabinClass'] | null;
  routeType: 'great_circle';
  source: 'manual';
}

export interface TrainJourneyPatch extends JourneyPatchBase {
  mode: 'train';
  operatorId: string | null;
  vehicleId: string | null;
  serviceNumber: string | null;
  seatNumber: string | null;
  cabinClass: TrainFormValues['trainClass'] | null;
  routeType: 'bezier';
  source: 'manual';
}

export interface OtherJourneyPatch extends JourneyPatchBase {
  mode: 'walk' | 'bike' | 'other';
  routeType: 'bezier';
  source: `manual:${OtherSubmode}`;
}

export function buildFlightJourneyPatch(
  values: FlightFormValues,
  distanceKm: number | null,
): FlightJourneyPatch {
  const durationMinutes = computeDurationMinutes(
    values.startTimeLocal,
    values.endTimeLocal,
    values.date,
  );
  return {
    mode: 'flight',
    fromLocationId: values.fromLocationId,
    toLocationId: values.toLocationId,
    date: values.date,
    startTimeLocal: values.startTimeLocal ?? null,
    endTimeLocal: values.endTimeLocal ?? null,
    operatorId: values.operatorId ?? null,
    vehicleId: values.vehicleId ?? null,
    serviceNumber: values.serviceNumber ?? null,
    seatNumber: values.seatNumber ?? null,
    cabinClass: values.cabinClass ?? null,
    distanceKm,
    durationMinutes: durationMinutes ?? null,
    routeType: 'great_circle',
    notes: values.notes ?? null,
    isManualEntry: true,
    source: 'manual',
  };
}

export function buildTrainJourneyPatch(
  values: TrainFormValues,
  distanceKm: number | null,
): TrainJourneyPatch {
  const durationMinutes = computeDurationMinutes(
    values.startTimeLocal,
    values.endTimeLocal,
    values.date,
  );
  return {
    mode: 'train',
    fromLocationId: values.fromLocationId,
    toLocationId: values.toLocationId,
    date: values.date,
    startTimeLocal: values.startTimeLocal ?? null,
    endTimeLocal: values.endTimeLocal ?? null,
    operatorId: values.operatorId ?? null,
    vehicleId: values.vehicleId ?? null,
    serviceNumber: values.serviceNumber ?? null,
    seatNumber: values.seatNumber ?? null,
    cabinClass: values.trainClass ?? null,
    distanceKm,
    durationMinutes: durationMinutes ?? null,
    routeType: 'bezier',
    notes: values.notes ?? null,
    isManualEntry: true,
    source: 'manual',
  };
}

function modeFromSubmode(submode: OtherSubmode): 'walk' | 'bike' | 'other' {
  if (submode === 'walk') return 'walk';
  if (submode === 'bike') return 'bike';
  return 'other';
}

export interface OtherJourneyPatchInputs {
  fromLocationId: string;
  toLocationId: string;
  distanceKm: number | null;
}

export function buildOtherJourneyPatch(
  values: OtherFormValues,
  inputs: OtherJourneyPatchInputs,
): OtherJourneyPatch {
  const durationMinutes = computeDurationMinutes(
    values.startTimeLocal,
    values.endTimeLocal,
    values.date,
  );
  return {
    mode: modeFromSubmode(values.submode),
    fromLocationId: inputs.fromLocationId,
    toLocationId: inputs.toLocationId,
    date: values.date,
    startTimeLocal: values.startTimeLocal ?? null,
    endTimeLocal: values.endTimeLocal ?? null,
    distanceKm: inputs.distanceKm,
    durationMinutes: durationMinutes ?? null,
    routeType: 'bezier',
    notes: values.notes ?? null,
    isManualEntry: true,
    source: `manual:${values.submode}`,
  };
}
