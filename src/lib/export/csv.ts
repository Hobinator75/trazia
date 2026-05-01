import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { listJourneysWithRefs } from '@/db/repositories/journey.repository';

const HEADER = [
  'id',
  'mode',
  'date',
  'from_iata',
  'from_name',
  'from_country',
  'to_iata',
  'to_name',
  'to_country',
  'operator_code',
  'operator_name',
  'service_number',
  'cabin_class',
  'seat_number',
  'distance_km',
  'duration_minutes',
  'notes',
];

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/\r?\n/g, ' ');
  return /[",;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export async function exportCsv(): Promise<{ uri: string; rows: number }> {
  const journeys = await listJourneysWithRefs(db);

  const lines = [HEADER.join(',')];
  for (const j of journeys) {
    lines.push(
      [
        j.id,
        j.mode,
        j.date,
        j.fromLocation?.iata,
        j.fromLocation?.name,
        j.fromLocation?.country,
        j.toLocation?.iata,
        j.toLocation?.name,
        j.toLocation?.country,
        j.operator?.code,
        j.operator?.name,
        j.serviceNumber,
        j.cabinClass,
        j.seatNumber,
        j.distanceKm,
        j.durationMinutes,
        j.notes,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  const payload = lines.join('\n');
  const today = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.documentDirectory ?? ''}trazia-journeys-${today}.csv`;

  await FileSystem.writeAsStringAsync(uri, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Reisen als CSV teilen',
      UTI: 'public.comma-separated-values-text',
    });
  }
  return { uri, rows: journeys.length };
}
