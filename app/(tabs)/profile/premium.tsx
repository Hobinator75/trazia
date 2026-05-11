import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsPremium } from '@/hooks/useIsPremium';
import { useOfferings } from '@/hooks/useOfferings';
import { isMockIap, purchasePackage, restorePurchases, setMockPremium } from '@/lib/iap';
import type { IapPackage, ProductId } from '@/lib/iap/types';
import { trackPaywallPurchased, trackPaywallShown } from '@/lib/observability/analytics';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

const FEATURE_KEYS = [
  'premium.feature_photos',
  'premium.feature_adfree',
  'premium.feature_sync',
  'premium.feature_wrapped',
  'premium.feature_routes',
  'premium.feature_themes',
  'premium.feature_achievements',
];

interface PlanCardProps {
  plan: IapPackage;
  selected: boolean;
  highlighted?: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, selected, highlighted, onSelect }: PlanCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onSelect}
      className={`overflow-hidden rounded-2xl border-2 ${
        selected ? 'border-primary' : 'border-border-light dark:border-border-dark'
      } bg-surface-light dark:bg-surface-dark active:opacity-80`}
    >
      {highlighted ? (
        <LinearGradient
          colors={['#3B82F633', '#A78BFA1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      <View className="px-4 py-4">
        {plan.introTrialDays ? (
          <View className="mb-2 self-start rounded-full bg-primary/30 px-2 py-1">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t('premium.trial_days', { days: plan.introTrialDays })}
            </Text>
          </View>
        ) : null}
        <Text className="text-base font-semibold text-text-dark dark:text-text-light">
          {plan.title}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-text-dark dark:text-text-light">
          {plan.priceLabel}
        </Text>
        {plan.pricePerMonthLabel ? (
          <Text className="text-xs text-text-muted-light dark:text-text-muted">
            {plan.pricePerMonthLabel}
          </Text>
        ) : null}
        <View className="mt-2 gap-1">
          {plan.bullets.map((bullet) => (
            <View key={bullet} className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text className="text-xs text-text-muted-light dark:text-text-muted">{bullet}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isPremium, hydrating } = useIsPremium();
  const { offerings, loading } = useOfferings();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [selected, setSelected] = useState<ProductId>('trazia_premium_yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void trackPaywallShown('profile');
  }, []);

  const handlePurchase = async () => {
    setBusy(true);
    const result = await purchasePackage(selected);
    setBusy(false);
    if (result.success) {
      void trackPaywallPurchased(selected);
      showSnackbar(t('premium.purchased'), { variant: 'success' });
      router.back();
    } else if (result.cancelled) {
      // Silent.
    } else if (result.error) {
      showSnackbar(result.error, { variant: 'error' });
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restorePurchases();
    setBusy(false);
    showSnackbar(result.success ? t('premium.restored_ok') : t('premium.restored_none'), {
      variant: result.success ? 'success' : 'info',
    });
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ title: t('premium.header_kicker') }} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View className="overflow-hidden rounded-3xl">
          <LinearGradient
            colors={['#3B82F6', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View className="px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {t('premium.header_kicker')}
            </Text>
            <Text className="mt-1 text-3xl font-bold text-white">{t('premium.header_title')}</Text>
            <Text className="mt-1 text-sm text-white/85">{t('premium.header_subtitle')}</Text>
          </View>
        </View>

        {isPremium ? (
          <View className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4">
            <Text className="text-base font-semibold text-success">{t('premium.already')}</Text>
            <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">
              {t('premium.already_desc')}
            </Text>
          </View>
        ) : null}

        <View className="mt-6 gap-3">
          {hydrating || loading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {offerings.yearly ? (
                <PlanCard
                  plan={offerings.yearly}
                  selected={selected === 'trazia_premium_yearly'}
                  highlighted
                  onSelect={() => setSelected('trazia_premium_yearly')}
                />
              ) : null}
              {offerings.monthly ? (
                <PlanCard
                  plan={offerings.monthly}
                  selected={selected === 'trazia_premium_monthly'}
                  onSelect={() => setSelected('trazia_premium_monthly')}
                />
              ) : null}
            </>
          )}
        </View>

        <View className="mt-6 rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
            {t('premium.features_title')}
          </Text>
          {FEATURE_KEYS.map((key) => (
            <View key={key} className="mt-2 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text className="flex-1 text-sm text-text-dark dark:text-text-light">{t(key)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handlePurchase}
          disabled={busy || isPremium}
          className={`mt-6 items-center rounded-full py-4 ${
            busy || isPremium ? 'bg-primary/40' : 'bg-primary active:opacity-80'
          }`}
        >
          <Text className="text-base font-semibold text-white">
            {busy
              ? t('premium.cta_busy')
              : isPremium
                ? t('premium.cta_active')
                : selected === 'trazia_premium_yearly'
                  ? t('premium.cta_yearly')
                  : t('premium.cta_monthly')}
          </Text>
        </Pressable>

        <Pressable onPress={handleRestore} disabled={busy} className="mt-3 items-center py-3">
          <Text className="text-sm text-primary">{t('premium.restore')}</Text>
        </Pressable>

        {isMockIap() ? (
          <View className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-warning">
              {t('premium.mock_title')}
            </Text>
            <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">
              {t('premium.mock_desc')}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  setMockPremium(true);
                  showSnackbar(t('premium.mock_on_toast'), { variant: 'success' });
                }}
                className="flex-1 items-center rounded-full border border-success bg-success/20 px-3 py-2"
              >
                <Text className="text-sm font-semibold text-success">{t('premium.mock_on')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMockPremium(false);
                  showSnackbar(t('premium.mock_off_toast'), { variant: 'info' });
                }}
                className="flex-1 items-center rounded-full border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2"
              >
                <Text className="text-sm font-semibold text-text-dark dark:text-text-light">
                  {t('premium.mock_off')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text className="mt-6 px-2 text-center text-xs text-text-muted-light dark:text-text-muted">
          {t('premium.fineprint')}
        </Text>
      </ScrollView>
    </View>
  );
}
