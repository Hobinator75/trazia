import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ProfileHeader } from '@/components/domain/ProfileHeader';
import { useIsPremium } from '@/hooks/useIsPremium';
import { showRewardedAd } from '@/lib/ads/rewarded';
import { usePremiumStore } from '@/stores/premiumStore';
import {
  type DistanceUnit,
  type LanguagePreference,
  type ThemePreference,
  useSettingsStore,
} from '@/stores/settings.store';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const formatRemaining = (epochMs: number): string => {
  const ms = Math.max(0, epochMs - Date.now());
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
};

interface SegmentSpec<T extends string> {
  value: T;
  label: string;
}

interface SegmentedRowProps<T extends string> {
  label: string;
  description?: string;
  options: readonly SegmentSpec<T>[];
  value: T;
  onChange: (next: T) => void;
}

function SegmentedRow<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: SegmentedRowProps<T>) {
  return (
    <View className="rounded-2xl border border-border-dark bg-surface-dark p-4">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </Text>
      {description ? <Text className="mb-2 text-xs text-text-muted">{description}</Text> : null}
      <View className="flex-row gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-full border px-3 py-2 ${
              value === opt.value
                ? 'border-primary bg-primary/20'
                : 'border-border-dark bg-background-dark'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                value === opt.value ? 'text-primary' : 'text-text-light'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border-dark bg-surface-dark p-4">
      <View className="flex-1 pr-3">
        <Text className="text-base text-text-light">{label}</Text>
        {description ? <Text className="text-xs text-text-muted">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border.dark }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface NavRowSpec {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

function NavRowGroup({ rows }: { rows: NavRowSpec[] }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border-dark bg-surface-dark">
      {rows.map((row, idx) => (
        <Link key={row.href} href={row.href as never} asChild>
          <Pressable
            className={`flex-row items-center justify-between px-4 py-4 active:bg-background-dark ${
              idx > 0 ? 'border-t border-border-dark' : ''
            }`}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name={row.icon} size={20} color={colors.text.muted} />
              <Text className="text-base text-text-light">{row.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const THEME_OPTIONS = [
  { value: 'dark' as const, label: 'Dunkel' },
  { value: 'light' as const, label: 'Hell' },
  { value: 'system' as const, label: 'System' },
];

const LANGUAGE_OPTIONS = [
  { value: 'de' as const, label: 'Deutsch' },
  { value: 'en' as const, label: 'English' },
  { value: 'system' as const, label: 'System' },
];

const UNIT_OPTIONS = [
  { value: 'km' as const, label: 'km' },
  { value: 'mi' as const, label: 'Meilen' },
];

const DATA_ROWS: NavRowSpec[] = [
  { href: '/profile/export', label: 'Daten exportieren', icon: 'download-outline' },
  { href: '/profile/backup', label: 'Backup & Restore', icon: 'cloud-upload-outline' },
];

const ABOUT_ROWS: NavRowSpec[] = [
  { href: '/profile/about', label: 'Über Trazia', icon: 'information-circle-outline' },
];

const LEGAL_ROWS: NavRowSpec[] = [
  { href: '/profile/privacy', label: 'Datenschutzerklärung', icon: 'lock-closed-outline' },
  { href: '/profile/imprint', label: 'Impressum', icon: 'document-outline' },
  { href: '/profile/terms', label: 'AGB', icon: 'reader-outline' },
];

const FEEDBACK_EMAIL = 'tim.hobrlant@gmail.com';

export default function ProfileScreen() {
  const router = useRouter();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const setDistanceUnit = useSettingsStore((s) => s.setDistanceUnit);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const crashReportsEnabled = useSettingsStore((s) => s.crashReportsEnabled);
  const setCrashReportsEnabled = useSettingsStore((s) => s.setCrashReportsEnabled);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const setAnalyticsEnabled = useSettingsStore((s) => s.setAnalyticsEnabled);

  const adFreeUntil = usePremiumStore((s) => s.adFreeUntil);
  const setAdFreeUntil = usePremiumStore((s) => s.setAdFreeUntil);
  const { isPremium } = useIsPremium();

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

  const handleFeedback = async () => {
    const subject = encodeURIComponent('Trazia Feedback');
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showSnackbar('Kein E-Mail-Client gefunden.', { variant: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Mailclient nicht verfügbar', {
        variant: 'error',
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-dark" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-3xl font-bold text-text-light">Profil</Text>

      <ProfileHeader />

      <Pressable
        onPress={() => router.push('/profile/premium')}
        className="mb-4 overflow-hidden rounded-2xl border-2 border-primary bg-primary/15 px-4 py-4 active:opacity-80"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/30">
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-text-light">
              {isPremium ? 'Trazia Premium aktiv' : 'Trazia Premium'}
            </Text>
            <Text className="text-xs text-text-muted">
              {isPremium
                ? 'Alle Features freigeschaltet. Danke!'
                : 'Werbefrei, Wrapped-Story, unbegrenzt Fotos.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </Pressable>

      <View className="gap-3">
        <SegmentedRow<ThemePreference>
          label="Erscheinungsbild"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
        <SegmentedRow<LanguagePreference>
          label="Sprache"
          description="Strings im UI; Reise-Einträge bleiben unverändert."
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={setLanguage}
        />
        <SegmentedRow<DistanceUnit>
          label="Einheiten"
          options={UNIT_OPTIONS}
          value={distanceUnit}
          onChange={setDistanceUnit}
        />
        <ToggleRow
          label="Sounds"
          description="Achievement-Chime beim Freischalten abspielen."
          value={soundEnabled}
          onValueChange={setSoundEnabled}
        />
        <ToggleRow
          label="Benachrichtigungen"
          description="Push beim Freischalten neuer Achievements (System-Berechtigung erforderlich)."
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <ToggleRow
          label="Crash-Reports erlauben"
          description="Anonyme Stack-Traces an Sentry — keine PII, kein Tracking."
          value={crashReportsEnabled}
          onValueChange={setCrashReportsEnabled}
        />
        <ToggleRow
          label="Analyse erlauben"
          description="Anonyme Nutzungs-Events (PostHog). Hilft Prioritäten zu setzen — opt-in."
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
        />
      </View>

      {!isPremium ? (
        <View className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
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

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Daten
      </Text>
      <NavRowGroup rows={DATA_ROWS} />

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Über
      </Text>
      <NavRowGroup rows={ABOUT_ROWS} />

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Rechtliches
      </Text>
      <NavRowGroup rows={LEGAL_ROWS} />

      <Pressable
        onPress={handleFeedback}
        className="mt-6 flex-row items-center justify-between rounded-2xl border border-border-dark bg-surface-dark px-4 py-4 active:bg-background-dark"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
          <Text className="text-base text-text-light">Feedback senden</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.text.muted} />
      </Pressable>
    </ScrollView>
  );
}
