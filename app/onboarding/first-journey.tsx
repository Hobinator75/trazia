import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { createJourney } from '@/db/repositories/journey.repository';
import { getLocationByIata } from '@/db/repositories/location.repository';
import { getOperatorByCode } from '@/db/repositories/operator.repository';
import { searchVehicles } from '@/db/repositories/vehicle.repository';
import { haversineDistance } from '@/lib/geo';
import { useSnackbarStore } from '@/stores/snackbarStore';

const yesterdayIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function OnboardingFirstJourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [working, setWorking] = useState(false);

  const seedExampleJourney = async (): Promise<void> => {
    setWorking(true);
    try {
      const [fra, jfk, lh, vehicles] = await Promise.all([
        getLocationByIata(db, 'FRA'),
        getLocationByIata(db, 'JFK'),
        getOperatorByCode(db, 'LH'),
        searchVehicles(db, 'A359', 'flight'),
      ]);
      if (!fra || !jfk) {
        showSnackbar(t('onboarding.first_journey.create_failed'), { variant: 'error' });
        return;
      }
      const distanceKm =
        Math.round(
          haversineDistance(
            { latitude: fra.lat, longitude: fra.lng },
            { latitude: jfk.lat, longitude: jfk.lng },
          ) * 10,
        ) / 10;
      await createJourney(
        db,
        {
          mode: 'flight',
          fromLocationId: fra.id,
          toLocationId: jfk.id,
          date: yesterdayIso(),
          serviceNumber: 'LH 400',
          operatorId: lh?.id ?? null,
          vehicleId: vehicles[0]?.id ?? null,
          cabinClass: 'business',
          distanceKm,
          durationMinutes: 540,
          routeType: 'great_circle',
          notes: t('onboarding.first_journey.sample_note'),
          isManualEntry: true,
          source: 'onboarding:example',
        },
        // Onboarding is the first run; suppress interstitial and toast so
        // the user isn't ambushed by an ad before they've seen the app.
        { evaluateAchievements: true, notify: false, triggerInterstitial: false },
      );
      showSnackbar(t('onboarding.first_journey.created'), { variant: 'success' });
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : t('error.save_failed'), {
        variant: 'error',
      });
    } finally {
      setWorking(false);
    }
  };

  const handleAccept = async (): Promise<void> => {
    await seedExampleJourney();
    router.push('/onboarding/permissions');
  };

  const handleSkip = (): void => {
    router.push('/onboarding/permissions');
  };

  return (
    <View className="flex-1 bg-background-dark" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-1 px-6">
        <Text className="mt-4 text-3xl font-bold text-text-light">
          {t('onboarding.first_journey.title')}
        </Text>
        <Text className="mt-2 text-base text-text-muted">
          {t('onboarding.first_journey.subtitle')}
        </Text>

        <View className="mt-6 rounded-3xl border border-border-dark bg-surface-dark p-5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t('onboarding.first_journey.label')}
          </Text>
          <Text className="mt-2 text-2xl font-bold text-text-light">FRA → JFK</Text>
          <Text className="text-sm text-text-muted">
            {t('onboarding.first_journey.subtitle_short')}
          </Text>
        </View>
      </View>

      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleAccept}
          disabled={working}
          className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${
            working ? 'bg-primary/40' : 'bg-primary active:opacity-80'
          }`}
        >
          {working ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="add-circle-outline" size={18} color="white" />
          )}
          <Text className="text-base font-semibold text-white">
            {working
              ? t('onboarding.first_journey.creating')
              : t('onboarding.first_journey.sample')}
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} className="items-center py-3">
          <Text className="text-sm text-text-muted">{t('onboarding.first_journey.skip')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
