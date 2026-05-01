import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsPremium } from '@/hooks/useIsPremium';
import { useOfferings } from '@/hooks/useOfferings';
import { isMockIap, purchasePackage, restorePurchases, setMockPremium } from '@/lib/iap';
import type { IapPackage, ProductId } from '@/lib/iap/types';
import { trackPaywallPurchased, trackPaywallShown } from '@/lib/observability/analytics';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

const FEATURES = [
  'Unbegrenzt Fotos pro Reise',
  'Werbefrei',
  'Cloud-Sync (in Phase 6)',
  'Year-in-Review als komplette Story',
  'Realistic Routes (Phase 3)',
  'Custom-Themes',
  'Premium-Achievements',
];

interface PlanCardProps {
  plan: IapPackage;
  selected: boolean;
  highlighted?: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, selected, highlighted, onSelect }: PlanCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      className={`overflow-hidden rounded-2xl border-2 ${
        selected ? 'border-primary' : 'border-border-dark'
      } bg-surface-dark active:opacity-80`}
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
              {plan.introTrialDays} Tage gratis testen
            </Text>
          </View>
        ) : null}
        <Text className="text-base font-semibold text-text-light">{plan.title}</Text>
        <Text className="mt-1 text-2xl font-bold text-text-light">{plan.priceLabel}</Text>
        {plan.pricePerMonthLabel ? (
          <Text className="text-xs text-text-muted">{plan.pricePerMonthLabel}</Text>
        ) : null}
        <View className="mt-2 gap-1">
          {plan.bullets.map((bullet) => (
            <View key={bullet} className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text className="text-xs text-text-muted">{bullet}</Text>
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
      showSnackbar('Premium aktiviert. Danke!', { variant: 'success' });
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
    showSnackbar(
      result.success ? 'Käufe wiederhergestellt' : 'Keine aktiven Premium-Käufe gefunden',
      { variant: result.success ? 'success' : 'info' },
    );
  };

  return (
    <View className="flex-1 bg-background-dark">
      <Stack.Screen options={{ title: 'Premium' }} />
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
              Trazia Premium
            </Text>
            <Text className="mt-1 text-3xl font-bold text-white">Mehr aus deinen Reisen</Text>
            <Text className="mt-1 text-sm text-white/85">
              Werbefrei, Premium-Features, Wrapped-Story.
            </Text>
          </View>
        </View>

        {isPremium ? (
          <View className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4">
            <Text className="text-base font-semibold text-success">Du hast bereits Premium.</Text>
            <Text className="mt-1 text-xs text-text-muted">Alle Features sind freigeschaltet.</Text>
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

        <View className="mt-6 rounded-2xl border border-border-dark bg-surface-dark p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Premium enthält
          </Text>
          {FEATURES.map((feature) => (
            <View key={feature} className="mt-2 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text className="flex-1 text-sm text-text-light">{feature}</Text>
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
              ? 'Bitte warten…'
              : isPremium
                ? 'Bereits aktiv'
                : selected === 'trazia_premium_yearly'
                  ? 'Jährlich aktivieren'
                  : 'Monatlich aktivieren'}
          </Text>
        </Pressable>

        <Pressable onPress={handleRestore} disabled={busy} className="mt-3 items-center py-3">
          <Text className="text-sm text-primary">Käufe wiederherstellen</Text>
        </Pressable>

        {isMockIap() ? (
          <View className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-warning">
              Mock-Modus
            </Text>
            <Text className="mt-1 text-xs text-text-muted">
              Kein RevenueCat-API-Key gesetzt. Käufe oben sind no-ops; benutze den Schalter für
              UI-Tests.
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  setMockPremium(true);
                  showSnackbar('Mock-Premium aktiv', { variant: 'success' });
                }}
                className="flex-1 items-center rounded-full border border-success bg-success/20 px-3 py-2"
              >
                <Text className="text-sm font-semibold text-success">Premium AN</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMockPremium(false);
                  showSnackbar('Mock-Premium inaktiv', { variant: 'info' });
                }}
                className="flex-1 items-center rounded-full border border-border-dark bg-background-dark px-3 py-2"
              >
                <Text className="text-sm font-semibold text-text-light">Premium AUS</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text className="mt-6 px-2 text-center text-xs text-text-muted">
          Verlängert sich automatisch · jederzeit kündbar in den App-Store-Einstellungen.
        </Text>
      </ScrollView>
    </View>
  );
}
