import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import {
  achievementUnlocks,
  journeyCompanions,
  journeyPhotos,
  journeyTags,
  journeys,
  locations,
  operators,
  tripJourneys,
  trips,
  vehicles,
} from '@/db/schema';
import { buildDbSnapshot, SNAPSHOT_VERSION, type DbSnapshot } from '@/lib/export/snapshot';

export interface BackupResult {
  uri: string;
  bytes: number;
}

export async function writeBackupFile(): Promise<BackupResult> {
  const snapshot = await buildDbSnapshot(db);
  const json = JSON.stringify(snapshot, replaceDate, 2);
  const filename = `trazia-backup-${snapshot.exportedAt.slice(0, 10)}.json`;
  const uri = `${FileSystem.documentDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Backup speichern',
      UTI: 'public.json',
    });
  }
  return { uri, bytes: json.length };
}

export interface RestoreResult {
  ok: true;
  counts: {
    locations: number;
    operators: number;
    vehicles: number;
    journeys: number;
    achievementUnlocks: number;
  };
}

export type RestoreError =
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'invalid-format' }
  | { ok: false; reason: 'unsupported-version'; version: number }
  | { ok: false; reason: 'io'; message: string };

export async function restoreFromBackup(): Promise<RestoreResult | RestoreError> {
  let pickResult: DocumentPicker.DocumentPickerResult;
  try {
    pickResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
  } catch (e) {
    return { ok: false, reason: 'io', message: e instanceof Error ? e.message : String(e) };
  }
  if (pickResult.canceled || !pickResult.assets[0]) {
    return { ok: false, reason: 'cancelled' };
  }

  const asset = pickResult.assets[0];
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    return { ok: false, reason: 'io', message: e instanceof Error ? e.message : String(e) };
  }

  let snapshot: DbSnapshot;
  try {
    snapshot = JSON.parse(raw) as DbSnapshot;
  } catch {
    return { ok: false, reason: 'invalid-format' };
  }
  if (typeof snapshot !== 'object' || snapshot === null || !Array.isArray(snapshot.locations)) {
    return { ok: false, reason: 'invalid-format' };
  }
  if (snapshot.version !== SNAPSHOT_VERSION) {
    return { ok: false, reason: 'unsupported-version', version: snapshot.version };
  }

  // Restore is destructive: we wipe existing rows and re-insert from the
  // backup. Order matters because of FK constraints — child rows first
  // (cascade deletes any leftover refs), then parents top-down.
  await db.delete(journeyPhotos);
  await db.delete(journeyTags);
  await db.delete(journeyCompanions);
  await db.delete(tripJourneys);
  await db.delete(trips);
  await db.delete(achievementUnlocks);
  await db.delete(journeys);
  await db.delete(operators);
  await db.delete(vehicles);
  await db.delete(locations);

  if (snapshot.locations.length > 0) await db.insert(locations).values(snapshot.locations);
  if (snapshot.operators.length > 0) await db.insert(operators).values(snapshot.operators);
  if (snapshot.vehicles.length > 0) await db.insert(vehicles).values(snapshot.vehicles);
  if (snapshot.journeys.length > 0) await db.insert(journeys).values(snapshot.journeys);
  if (snapshot.journeyCompanions.length > 0)
    await db.insert(journeyCompanions).values(snapshot.journeyCompanions);
  if (snapshot.journeyTags.length > 0) await db.insert(journeyTags).values(snapshot.journeyTags);
  if (snapshot.journeyPhotos.length > 0)
    await db.insert(journeyPhotos).values(snapshot.journeyPhotos);
  if (snapshot.trips.length > 0) await db.insert(trips).values(snapshot.trips);
  if (snapshot.tripJourneys.length > 0) await db.insert(tripJourneys).values(snapshot.tripJourneys);
  if (snapshot.achievementUnlocks.length > 0)
    await db.insert(achievementUnlocks).values(snapshot.achievementUnlocks);

  return {
    ok: true,
    counts: {
      locations: snapshot.locations.length,
      operators: snapshot.operators.length,
      vehicles: snapshot.vehicles.length,
      journeys: snapshot.journeys.length,
      achievementUnlocks: snapshot.achievementUnlocks.length,
    },
  };
}

function replaceDate(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}
