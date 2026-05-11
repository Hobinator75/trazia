import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ProfileHeader } from '@/components/domain/ProfileHeader';
import { useIsPremium } from '@/hooks/useIsPremium';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/config';
import { showRewardedAd } from '@/lib/ads/rewarded';
import { adFrequency } from '@/lib/ads/units';
import {
  canGrantRewardedTrial,
  grantTemporaryProEntitlement,
} from '@/lib/iap/temporaryEntitlement';
import { usePremiumStore } from '@/stores/premiumStore';
import {
  type DistanceUnit,
  type ThemePreference,
  useSettingsStore,
} from '@/stores/settings.store';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

const formatRemaining = (epochMs: number): string => {
  const ms = Math.max(0, epochMs - Date.now());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
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
    <View className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {label}
      </Text>
      {description ? <Text className="mb-2 text-xs text-text-muted-light dark:text-text-muted">{description}</Text> : null}
      <View className="flex-row gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-full border px-3 py-2 ${
              value === opt.value
                ? 'border-primary bg-primary/20'
                : 'border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                value === opt.value ? 'text-primary' : 'text-text-dark dark:text-text-light'
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
    <View className="flex-row items-center justify-between rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
      <View className="flex-1 pr-3">
        <Text className="text-base text-text-dark dark:text-text-light">{label}</Text>
        {description ? <Text className="text-xs text-text-muted-light dark:text-text-muted">{description}</Text> : null}
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
  trailing?: string;
}

function NavRowGroup({ rows }: { rows: NavRowSpec[] }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      {rows.map((row, idx) => (
        <Link key={row.href} href={row.href as never} asChild>
          <Pressable
            className={`flex-row items-center justify-between px-4 py-4 active:bg-background-light dark:active:bg-background-dark ${
              idx > 0 ? 'border-t border-border-light dark:border-border-dark' : ''
            }`}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name={row.icon} size={20} color={colors.text.muted} />
              <Text className="text-base text-text-dark dark:text-text-light">{row.label}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {row.trailing ? (
                <Text className="text-sm text-text-muted-light dark:text-text-muted">{row.trailing}</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const FEEDBACK_EMAIL = 'info@trazia.app';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const locale = useSettingsStore((s) => s.locale);
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

  const proTrialUntil = usePremiumStore((s) => s.proTrialUntil);
  const setProTrialUntil = usePremiumStore((s) => s.setProTrialUntil);
  const { isPremium } = useIsPremium();

  const [busyRewarded, setBusyRewarded] = useState(false);

  const trialActive = proTrialUntil !== null && proTrialUntil > Date.now();

  const themeOptions = useMemo<readonly SegmentSpec<ThemePreference>[]>(
    () => [
      { value: 'system', label: t('profile.appearance_auto') },
      { value: 'light', label: t('profile.appearance_light') },
      { value: 'dark', label: t('profile.appearance_dark') },
    ],
    [t],
  );

  const unitOptions = useMemo<readonly SegmentSpec<DistanceUnit>[]>(
    () => [
      { value: 'km', label: t('profile.distance_km') },
      { value: 'mi', label: t('profile.distance_mi') },
    ],
    [t],
  );

  const activeLocale = (locale ?? (i18n.language as SupportedLocale)) ?? 'en';
  const activeLocaleNative =
    SUPPORTED_LOCALES.find((entry) => entry.code === activeLocale)?.nativeName ?? 'English';

  const settingsRows: NavRowSpec[] = [
    {
      href: '/onboarding/language',
      label: t('profile.language'),
      icon: 'language-outline',
      trailing: activeLocaleNative,
    },
  ];

  const dataRows: NavRowSpec[] = [
    { href: '/profile/export', label: t('profile.data_export'), icon: 'download-outline' },
    { href: '/profile/backup', label: t('profile.data_backup'), icon: 'cloud-upload-outline' },
  ];

  const aboutRows: NavRowSpec[] = [
    { href: '/profile/about', label: t('profile.about_app'), icon: 'information-circle-outline' },
  ];

  const legalRows: NavRowSpec[] = [
    { href: '/profile/privacy', label: t('profile.legal_privacy'), icon: 'lock-closed-outline' },
    { href: '/profile/imprint', label: t('profile.legal_imprint'), icon: 'document-outline' },
    { href: '/profile/terms', label: t('profile.legal_terms'), icon: 'reader-outline' },
  ];

  const handleRewardedAd = async () => {
    setBusyRewarded(true);
    try {
      // Anti-abuse: at most one rewarded trial per device per 30 days.
      // Check before showing the ad so a blocked user doesn't waste a
      // video impression.
      const status = await canGrantRewardedTrial();
      if (!status.allowed) {
        const days = status.nextEligibleAt
          ? Math.max(1, Math.ceil((status.nextEligibleAt - Date.now()) / (24 * 60 * 60 * 1000)))
          : 30;
        showSnackbar(t('profile.trial_used', { days }), { variant: 'info' });
        return;
      }
      const result = await showRewardedAd();
      if (result.kind === 'rewarded') {
        const grant = await grantTemporaryProEntitlement(
          adFrequency.rewardedTrialDays,
          'rewarded_ad',
        );
        if (grant.granted && grant.entitlement) {
          setProTrialUntil(grant.entitlement.expiresAt);
          showSnackbar(t('profile.trial_granted', { days: adFrequency.rewardedTrialDays }), {
            variant: 'success',
          });
        } else {
          showSnackbar(t('profile.trial_grant_failed'), { variant: 'error' });
        }
      } else if (result.kind === 'cancelled') {
        showSnackbar(t('profile.ad_cancelled'), { variant: 'info' });
      } else {
        showSnackbar(t('profile.ad_unavailable'), { variant: 'error' });
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
        showSnackbar(t('profile.mail_client_missing'), { variant: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('profile.mail_client_unavailable'), {
        variant: 'error',
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-3xl font-bold text-text-dark dark:text-text-light">{t('profile.title')}</Text>

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
            <Text className="text-base font-bold text-text-dark dark:text-text-light">
              {isPremium ? t('profile.premium_active') : t('profile.premium')}
            </Text>
            <Text className="text-xs text-text-muted-light dark:text-text-muted">
              {isPremium ? t('profile.premium_active_subtitle') : t('profile.premium_subtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </Pressable>

      <View className="gap-3">
        <SegmentedRow<ThemePreference>
          label={t('profile.appearance')}
          options={themeOptions}
          value={theme}
          onChange={setTheme}
        />
        <NavRowGroup rows={settingsRows} />
        <SegmentedRow<DistanceUnit>
          label={t('profile.units_title')}
          options={unitOptions}
          value={distanceUnit}
          onChange={setDistanceUnit}
        />
        <ToggleRow
          label={t('profile.sound_title')}
          description={t('profile.sound_desc')}
          value={soundEnabled}
          onValueChange={setSoundEnabled}
        />
        <ToggleRow
          label={t('profile.notifications_title')}
          description={t('profile.notifications_desc')}
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <ToggleRow
          label={t('profile.crash_reports_title')}
          description={t('profile.crash_reports_desc')}
          value={crashReportsEnabled}
          onValueChange={setCrashReportsEnabled}
        />
        <ToggleRow
          label={t('profile.analytics_title')}
          description={t('profile.analytics_desc')}
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
        />
      </View>

      {!isPremium ? (
        <View className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="play-circle-outline" size={20} color={colors.warning} />
            <Text className="text-base font-semibold text-text-dark dark:text-text-light">
              {t('profile.trial_title', { days: adFrequency.rewardedTrialDays })}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">
            {t('profile.trial_desc', { days: adFrequency.rewardedTrialDays })}
          </Text>
          {trialActive ? (
            <Text className="mt-2 text-xs text-success">
              {t('profile.trial_active', { remaining: formatRemaining(proTrialUntil ?? 0) })}
            </Text>
          ) : null}
          <Pressable
            onPress={handleRewardedAd}
            disabled={busyRewarded || trialActive}
            className={`mt-3 items-center rounded-full py-3 ${
              busyRewarded || trialActive ? 'bg-warning/40' : 'bg-warning active:opacity-80'
            }`}
          >
            <Text className="text-sm font-semibold text-background-dark">
              {busyRewarded
                ? t('profile.trial_loading')
                : trialActive
                  ? t('profile.trial_already_active')
                  : t('profile.trial_start')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {t('profile.data_section')}
      </Text>
      <NavRowGroup rows={dataRows} />

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {t('profile.about_section')}
      </Text>
      <NavRowGroup rows={aboutRows} />

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {t('profile.legal_section')}
      </Text>
      <NavRowGroup rows={legalRows} />

      <Pressable
        onPress={handleFeedback}
        className="mt-6 flex-row items-center justify-between rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-4 active:bg-background-light dark:active:bg-background-dark"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
          <Text className="text-base text-text-dark dark:text-text-light">{t('profile.feedback')}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.text.muted} />
      </Pressable>
    </ScrollView>
  );
}
