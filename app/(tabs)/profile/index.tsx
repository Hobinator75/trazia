import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { useIsPremium } from '@/hooks/useIsPremium';
import { showRewardedAd } from '@/lib/ads/rewarded';
import { usePremiumStore } from '@/stores/premiumStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

const ROWS = [
  { href: '/profile/premium' as const, label: 'Premium', icon: 'star-outline' as const },
  {
    href: '/profile/about' as const,
    label: 'Über Trazia',
    icon: 'information-circle-outline' as const,
  },
  { href: '/profile/privacy' as const, label: 'Datenschutz', icon: 'lock-closed-outline' as const },
  { href: '/profile/export' as const, label: 'Daten-Export', icon: 'download-outline' as const },
  { href: '/profile/backup' as const, label: 'Backup', icon: 'cloud-upload-outline' as const },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const formatRemaining = (epochMs: number): string => {
  const ms = Math.max(0, epochMs - Date.now());
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
};

export default function ProfileScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const adFreeUntil = usePremiumStore((s) => s.adFreeUntil);
  const setAdFreeUntil = usePremiumStore((s) => s.setAdFreeUntil);
  const { isPremium } = useIsPremium();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [busyRewarded, setBusyRewarded] = useState(false);

  const adFreeActive = adFreeUntil !== null && adFreeUntil > Date.now();

  const handleRewardedAd = async () => {
    setBusyRewarded(true);
    try {
      const result = await showRewardedAd();
      if (result === 'rewarded') {
        setAdFreeUntil(Date.now() + ONE_DAY_MS);
        showSnackbar('24 Stunden werbefrei aktiviert.', { variant: 'success' });
      } else if (result === 'cancelled') {
        showSnackbar('Werbe-Video wurde abgebrochen.', { variant: 'info' });
      } else {
        showSnackbar('Werbe-Video gerade nicht verfügbar.', { variant: 'error' });
      }
    } finally {
      setBusyRewarded(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-dark" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-3xl font-bold text-text-light">Profil</Text>

      <View className="mb-4 rounded-2xl border border-border-dark bg-surface-dark p-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Erscheinungsbild
        </Text>
        <View className="flex-row gap-2">
          {(['dark', 'light', 'system'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setTheme(mode)}
              className={`flex-1 items-center rounded-full border px-3 py-2 ${
                theme === mode
                  ? 'border-primary bg-primary/20'
                  : 'border-border-dark bg-background-dark'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  theme === mode ? 'text-primary' : 'text-text-light'
                }`}
              >
                {mode === 'dark' ? 'Dunkel' : mode === 'light' ? 'Hell' : 'System'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-border-dark bg-surface-dark p-4">
        <View className="flex-1 pr-3">
          <Text className="text-base text-text-light">Sounds</Text>
          <Text className="text-xs text-text-muted">
            Achievement-Chime beim Freischalten abspielen.
          </Text>
        </View>
        <Switch
          value={soundEnabled}
          onValueChange={setSoundEnabled}
          trackColor={{ true: colors.primary, false: colors.border.dark }}
          thumbColor="#FFFFFF"
        />
      </View>

      {!isPremium ? (
        <View className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="play-circle-outline" size={20} color={colors.warning} />
            <Text className="text-base font-semibold text-text-light">24 h werbefrei</Text>
          </View>
          <Text className="mt-1 text-xs text-text-muted">
            Schaue ein kurzes Werbe-Video und nutze Trazia für 24 Stunden ohne Banner und
            Interstitials.
          </Text>
          {adFreeActive ? (
            <Text className="mt-2 text-xs text-success">
              Werbefrei aktiv · noch {formatRemaining(adFreeUntil ?? 0)}
            </Text>
          ) : null}
          <Pressable
            onPress={handleRewardedAd}
            disabled={busyRewarded}
            className={`mt-3 items-center rounded-full py-3 ${
              busyRewarded ? 'bg-warning/40' : 'bg-warning active:opacity-80'
            }`}
          >
            <Text className="text-sm font-semibold text-background-dark">
              {busyRewarded ? 'Lädt…' : adFreeActive ? 'Verlängern' : 'Werbe-Video starten'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-border-dark bg-surface-dark">
        {ROWS.map((row, idx) => (
          <Link key={row.href} href={row.href} asChild>
            <Pressable
              className={`flex-row items-center justify-between px-4 py-4 active:bg-background-dark ${
                idx > 0 ? 'border-t border-border-dark' : ''
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name={row.icon} size={20} color="#9CA3AF" />
                <Text className="text-base text-text-light">{row.label}</Text>
                {row.href === '/profile/premium' && isPremium ? (
                  <View className="rounded-full bg-success/20 px-2 py-0.5">
                    <Text className="text-[10px] font-bold uppercase text-success">Aktiv</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
