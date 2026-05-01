import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsPremium } from '@/hooks/useIsPremium';
import { exportCsv, exportJson, exportPdf } from '@/lib/export';
import { useSettingsStore } from '@/stores/settings.store';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

type ExportFormat = 'json' | 'csv' | 'pdf';

interface RowSpec {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  premiumOnly: boolean;
}

const ROWS: RowSpec[] = [
  {
    format: 'json',
    label: 'JSON-Export',
    description: 'Kompletter, maschinen-lesbarer Snapshot deiner Daten. Auch im Free-Plan.',
    icon: 'code-outline',
    premiumOnly: false,
  },
  {
    format: 'csv',
    label: 'CSV-Export',
    description: 'Reisen als Tabelle für Excel / Numbers.',
    icon: 'list-outline',
    premiumOnly: true,
  },
  {
    format: 'pdf',
    label: 'PDF mit Karte',
    description: 'Visueller Reise-Bericht inkl. Routenkarte, Top-Routen und Achievements.',
    icon: 'document-text-outline',
    premiumOnly: true,
  },
];

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium } = useIsPremium();
  const profileName = useSettingsStore((s) => s.profileName);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const trigger = async (format: ExportFormat): Promise<void> => {
    setBusy(format);
    try {
      if (format === 'json') {
        const result = await exportJson();
        showSnackbar(`JSON-Export bereit (${Math.round(result.bytes / 1024)} KB).`, {
          variant: 'success',
        });
      } else if (format === 'csv') {
        const result = await exportCsv();
        showSnackbar(`${result.rows} Reisen als CSV exportiert.`, { variant: 'success' });
      } else {
        await exportPdf({ ...(profileName ? { username: profileName } : {}) });
        showSnackbar('PDF-Bericht bereit.', { variant: 'success' });
      }
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Export fehlgeschlagen', {
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const onPressRow = (row: RowSpec): void => {
    if (row.premiumOnly && !isPremium) {
      router.push('/profile/premium');
      return;
    }
    void trigger(row.format);
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
      <Text className="mb-4 text-sm text-text-muted">
        Alle Exporte landen über das System-Share-Sheet bei dir — Trazia versendet nichts an Dritte.
      </Text>

      <View className="rounded-2xl border border-border-dark bg-surface-dark">
        {ROWS.map((row, idx) => {
          const locked = row.premiumOnly && !isPremium;
          const loading = busy === row.format;
          return (
            <Pressable
              key={row.format}
              onPress={() => onPressRow(row)}
              disabled={busy !== null}
              className={`flex-row items-center gap-3 px-4 py-4 ${
                idx > 0 ? 'border-t border-border-dark' : ''
              } ${busy !== null ? 'opacity-60' : 'active:bg-background-dark'}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <Ionicons name={row.icon} size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-text-light">{row.label}</Text>
                  {locked ? (
                    <View className="rounded-full bg-warning/20 px-2 py-0.5">
                      <Text className="text-[10px] font-bold uppercase text-warning">Premium</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-text-muted">{row.description}</Text>
              </View>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons
                  name={locked ? 'lock-closed' : 'chevron-forward'}
                  size={18}
                  color={colors.text.muted}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
