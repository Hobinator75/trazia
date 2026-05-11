import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { db } from '@/db/client';
import {
  getJourneyExtras,
  getJourneyWithRefsById,
  type JourneyExtras,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';

import { FlightForm } from '@/components/domain/AddJourney/FlightForm';
import { OtherForm } from '@/components/domain/AddJourney/OtherForm';
import { TrainForm } from '@/components/domain/AddJourney/TrainForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface LoadState {
  journey: JourneyWithRefs | null;
  extras: JourneyExtras | null;
  loading: boolean;
}

export default function EditJourneyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>({ journey: null, extras: null, loading: true });

  const load = useCallback(async () => {
    if (!id) {
      setState({ journey: null, extras: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const [journey, extras] = await Promise.all([
      getJourneyWithRefsById(db, id),
      getJourneyExtras(db, id),
    ]);
    setState({ journey: journey ?? null, extras, loading: false });
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return <LoadingScreen subtitle={t('journey.edit_loading')} />;
  }

  if (!state.journey || !state.extras) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark px-6">
        <Stack.Screen options={{ title: t('journey.edit_other_title') }} />
        <Text className="mb-4 text-lg text-text-dark dark:text-text-light">
          {t('journey.edit_not_found')}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="rounded-full bg-primary px-6 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const editing = { journey: state.journey, extras: state.extras };

  if (state.journey.mode === 'flight') {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark">
        <Stack.Screen options={{ title: t('journey.edit_flight_title') }} />
        <FlightForm editing={editing} />
      </View>
    );
  }

  if (state.journey.mode === 'train') {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark">
        <Stack.Screen options={{ title: t('journey.edit_train_title') }} />
        <TrainForm editing={editing} />
      </View>
    );
  }

  // car / walk / bike / ship / other → OtherForm. OtherForm reads the original
  // submode from `source` so the segmented control lands on the right value.
  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ title: t('journey.edit_other_title') }} />
      <OtherForm editing={editing} />
    </View>
  );
}
