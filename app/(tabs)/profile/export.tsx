import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  descKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  premiumOnly: boolean;
}

const ROWS: RowSpec[] = [
  {
    format: 'json',
    labelKey: 'export.json_label',
    descKey: 'export.json_desc',
    icon: 'code-outline',
    premiumOnly: false,
  },
  {
    format: 'csv',
    labelKey: 'export.csv_label',
    descKey: 'export.csv_desc',
    icon: 'list-outline',
    premiumOnly: true,
  },
  {
    format: 'pdf',
    labelKey: 'export.pdf_label',
    descKey: 'export.pdf_desc',
    icon: 'document-text-outline',
    premiumOnly: true,
  },
];

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPremium } = useIsPremium();
  const profileName = useSettingsStore((s) => s.profileName);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const trigger = async (format: ExportFormat): Promise<void> => {
    setBusy(format);
    try {
      if (format === 'json') {
        const result = await exportJson();
        showSnackbar(t('export.json_ready', { kb: Math.round(result.bytes / 1024) }), {
          variant: 'success',
        });
      } else if (format === 'csv') {
        const result = await exportCsv();
        showSnackbar(t('export.csv_ready', { count: result.rows }), { variant: 'success' });
      } else {
        await exportPdf({ ...(profileName ? { username: profileName } : {}) });
        showSnackbar(t('export.pdf_ready'), { variant: 'success' });
      }
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('export.failed'), {
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
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <Text className="mb-4 text-sm text-text-muted-light dark:text-text-muted">
        {t('export.preamble')}
      </Text>

      <View className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        {ROWS.map((row, idx) => {
          const locked = row.premiumOnly && !isPremium;
          const loading = busy === row.format;
          return (
            <Pressable
              key={row.format}
              onPress={() => onPressRow(row)}
              disabled={busy !== null}
              className={`flex-row items-center gap-3 px-4 py-4 ${
                idx > 0 ? 'border-t border-border-light dark:border-border-dark' : ''
              } ${busy !== null ? 'opacity-60' : 'active:bg-background-light dark:active:bg-background-dark'}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <Ionicons name={row.icon} size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-text-dark dark:text-text-light">
                    {t(row.labelKey)}
                  </Text>
                  {locked ? (
                    <View className="rounded-full bg-warning/20 px-2 py-0.5">
                      <Text className="text-[10px] font-bold uppercase text-warning">
                        {t('export.premium_badge')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-text-muted-light dark:text-text-muted">
                  {t(row.descKey)}
                </Text>
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
