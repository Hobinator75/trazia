import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { restoreFromBackup, writeBackupFile } from '@/lib/backup';
import { wipeAllData } from '@/lib/data/wipeAll';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

type BusyKind = 'backup' | 'restore' | 'wipe' | null;

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [busy, setBusy] = useState<BusyKind>(null);

  const handleBackup = async (): Promise<void> => {
    setBusy('backup');
    try {
      const result = await writeBackupFile();
      showSnackbar(t('backup.backup_done', { kb: Math.round(result.bytes / 1024) }), {
        variant: 'success',
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('backup.backup_failed'), {
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = (): void => {
    Alert.alert(t('backup.restore_title_confirm'), t('backup.restore_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('backup.restore_cta'),
        style: 'destructive',
        onPress: async () => {
          setBusy('restore');
          try {
            const result = await restoreFromBackup();
            if (result.ok) {
              showSnackbar(t('backup.restore_done', { count: result.counts.journeys }), {
                variant: 'success',
              });
            } else if (result.reason === 'cancelled') {
              showSnackbar(t('backup.restore_cancelled'), { variant: 'info' });
            } else if (result.reason === 'unsupported-version') {
              showSnackbar(t('backup.restore_unsupported', { version: result.version }), {
                variant: 'error',
              });
            } else if (result.reason === 'invalid-format') {
              showSnackbar(t('backup.restore_invalid'), { variant: 'error' });
            } else if (result.reason === 'invalid-snapshot') {
              showSnackbar(t('backup.restore_corrupt'), { variant: 'error' });
            } else if (result.reason === 'transaction-failed') {
              showSnackbar(t('backup.restore_tx_failed'), { variant: 'error' });
            } else {
              showSnackbar(t('backup.restore_failed', { message: result.message }), {
                variant: 'error',
              });
            }
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const confirmWipe = (): void => {
    Alert.alert(t('backup.wipe_confirm_title'), t('backup.wipe_confirm_body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('backup.wipe_confirm_continue'),
        style: 'destructive',
        onPress: () => {
          // Double-confirm per spec.
          Alert.alert(t('backup.wipe_double_title'), t('backup.wipe_double_body'), [
            { text: t('backup.wipe_double_cancel'), style: 'cancel' },
            {
              text: t('backup.wipe_double_confirm'),
              style: 'destructive',
              onPress: async () => {
                setBusy('wipe');
                try {
                  await wipeAllData();
                  showSnackbar(t('backup.wipe_done'), {
                    variant: 'success',
                    durationMs: 6000,
                  });
                } catch (e) {
                  showSnackbar(e instanceof Error ? e.message : t('backup.wipe_failed'), {
                    variant: 'error',
                  });
                } finally {
                  setBusy(null);
                }
              },
            },
          ]);
        },
      },
    ]);
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
      <View className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <BackupRow
          icon="cloud-upload-outline"
          title={t('backup.create_title')}
          description={t('backup.create_desc')}
          loading={busy === 'backup'}
          onPress={handleBackup}
          disabled={busy !== null}
        />
        <View className="h-px bg-border-light dark:bg-border-dark" />
        <BackupRow
          icon="refresh-outline"
          title={t('backup.restore_title')}
          description={t('backup.restore_desc')}
          loading={busy === 'restore'}
          onPress={confirmRestore}
          disabled={busy !== null}
        />
      </View>

      <View className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="warning-outline" size={20} color={colors.danger} />
          <Text className="text-base font-semibold text-danger">{t('backup.wipe_title')}</Text>
        </View>
        <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">
          {t('backup.wipe_desc')}
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
            <Text className="text-sm font-semibold text-white">{t('backup.wipe_cta')}</Text>
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
        disabled
          ? 'opacity-60'
          : 'active:bg-background-light dark:active:bg-background-dark'
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-text-dark dark:text-text-light">{title}</Text>
        <Text className="text-xs text-text-muted-light dark:text-text-muted">{description}</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
    </Pressable>
  );
}
