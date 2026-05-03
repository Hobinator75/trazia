import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { buildDbSnapshot, SNAPSHOT_VERSION, type DbSnapshot } from '@/lib/export/snapshot';

import { restoreFromSnapshot } from './restore';

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
  | { ok: false; reason: 'invalid-snapshot'; errors: string[] }
  | { ok: false; reason: 'transaction-failed'; message: string }
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

  // Delegate the destructive phase to restoreFromSnapshot, which wraps
  // the wipe + replay in a single SQLite transaction with a pre-flight
  // schema/FK validation. A bad backup or a mid-restore error rolls
  // back, so the user's existing data survives the failure.
  const restoreResult = await restoreFromSnapshot(db, snapshot);
  if (restoreResult.ok) return restoreResult;
  if (restoreResult.reason === 'invalid-snapshot') {
    return { ok: false, reason: 'invalid-snapshot', errors: restoreResult.errors };
  }
  return {
    ok: false,
    reason: 'transaction-failed',
    message: restoreResult.message,
  };
}

function replaceDate(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}
