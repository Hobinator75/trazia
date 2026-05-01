import type { JourneyWithRefs } from '@/db/repositories/journey.repository';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimestamp(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—';
  if (km >= 100) return `${Math.round(km).toLocaleString('de-DE')} km`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function journeyTitle(journey: JourneyWithRefs): { from: string; to: string } {
  const from =
    journey.fromLocation?.iata ?? journey.fromLocation?.icao ?? journey.fromLocation?.name ?? '?';
  const to =
    journey.toLocation?.iata ?? journey.toLocation?.icao ?? journey.toLocation?.name ?? '?';
  return { from, to };
}

const CABIN_LABELS: Record<string, string> = {
  economy: 'Economy',
  premium_economy: 'Premium Eco',
  business: 'Business',
  first: 'First',
};

export function formatCabin(value: string | null | undefined): string {
  if (!value) return '—';
  return CABIN_LABELS[value] ?? value;
}

export function shareSnippet(journey: JourneyWithRefs): string {
  const { from, to } = journeyTitle(journey);
  const distance = formatDistance(journey.distanceKm);
  const duration = formatDuration(journey.durationMinutes);
  const tail = [distance, duration].filter((v) => v !== '—').join(' in ');
  return `Mein ${journey.mode === 'flight' ? 'Flug' : 'Trip'} ${from} → ${to} auf Trazia${
    tail ? `: ${tail}` : ''
  }`;
}
