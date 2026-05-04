import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { restoreFromBackup, writeBackupFile } from '@/lib/backup';
import { wipeAllData } from '@/lib/data/wipeAll';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

type BusyKind = 'backup' | 'restore' | 'wipe' | null;

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [busy, setBusy] = useState<BusyKind>(null);

  const handleBackup = async (): Promise<void> => {
    setBusy('backup');
    try {
      const result = await writeBackupFile();
      showSnackbar(`Backup gespeichert (${Math.round(result.bytes / 1024)} KB).`, {
        variant: 'success',
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Backup fehlgeschlagen', {
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = (): void => {
    Alert.alert(
      'Backup einspielen?',
      'Alle aktuellen Reisen werden überschrieben. Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Einspielen',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            try {
              const result = await restoreFromBackup();
              if (result.ok) {
                showSnackbar(`Backup eingespielt (${result.counts.journeys} Reisen).`, {
                  variant: 'success',
                });
              } else if (result.reason === 'cancelled') {
                showSnackbar('Restore abgebrochen.', { variant: 'info' });
              } else if (result.reason === 'unsupported-version') {
                showSnackbar(`Backup-Version ${result.version} wird nicht unterstützt.`, {
                  variant: 'error',
                });
              } else if (result.reason === 'invalid-format') {
                showSnackbar('Datei ist kein gültiges Trazia-Backup.', {
                  variant: 'error',
                });
              } else if (result.reason === 'invalid-snapshot') {
                showSnackbar('Backup-Datei ist beschädigt — deine Daten sind unverändert.', {
                  variant: 'error',
                });
              } else if (result.reason === 'transaction-failed') {
                showSnackbar('Restore fehlgeschlagen — deine Daten sind unverändert.', {
                  variant: 'error',
                });
              } else {
                showSnackbar(`Restore fehlgeschlagen: ${result.message}`, { variant: 'error' });
              }
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const confirmWipe = (): void => {
    Alert.alert(
      'Alle Daten löschen?',
      'Reisen, Achievements und Einstellungen werden unwiderruflich entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Weiter',
          style: 'destructive',
          onPress: () => {
            // Double-confirm per spec.
            Alert.alert(
              'Sicher?',
              'Letzte Warnung. Es gibt kein Zurück und kein Backup wird automatisch erstellt.',
              [
                { text: 'Doch nicht', style: 'cancel' },
                {
                  text: 'Endgültig löschen',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy('wipe');
                    try {
                      await wipeAllData();
                      showSnackbar('Alle Daten gelöscht — bitte App neu starten.', {
                        variant: 'success',
                        durationMs: 6000,
                      });
                    } catch (e) {
                      showSnackbar(e instanceof Error ? e.message : 'Löschen fehlgeschlagen', {
                        variant: 'error',
                      });
                    } finally {
                      setBusy(null);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <View className="rounded-2xl border border-border-dark bg-surface-dark">
        <BackupRow
          icon="cloud-upload-outline"
          title="Backup erstellen"
          description="Speichert alle Daten als JSON-Datei. Übers Share-Sheet in iCloud Drive oder Google Drive ablegen."
          loading={busy === 'backup'}
          onPress={handleBackup}
          disabled={busy !== null}
        />
        <View className="h-px bg-border-dark" />
        <BackupRow
          icon="refresh-outline"
          title="Aus Backup wiederherstellen"
          description="Wähle eine zuvor exportierte Trazia-Backup-Datei (.json)."
          loading={busy === 'restore'}
          onPress={confirmRestore}
          disabled={busy !== null}
        />
      </View>

      <View className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="warning-outline" size={20} color={colors.danger} />
          <Text className="text-base font-semibold text-danger">Alle Daten löschen</Text>
        </View>
        <Text className="mt-1 text-xs text-text-muted">
          Setzt Trazia in den Auslieferungs-Zustand zurück. Verfasse vorher ein Backup oder einen
          Export.
        </Text>
        <Pressable
          onPress={confirmWipe}
          disabled={busy !== null}
          className={`mt-3 items-center rounded-full py-3 ${
            busy === 'wipe' ? 'bg-danger/40' : 'bg-danger active:opacity-80'
          }`}
        >
          {busy === 'wipe' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-semibold text-white">Daten löschen…</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

interface BackupRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}

function BackupRow({ icon, title, description, loading, disabled, onPress }: BackupRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 px-4 py-4 ${
        disabled ? 'opacity-60' : 'active:bg-background-dark'
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-text-light">{title}</Text>
        <Text className="text-xs text-text-muted">{description}</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
    </Pressable>
  );
}
