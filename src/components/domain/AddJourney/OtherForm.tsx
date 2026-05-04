import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import {
  saveJourneyWithExtras,
  type JourneyExtras,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';
import { locations } from '@/db/schema';
import {
  type OtherFormValues,
  otherFormSchema,
  otherSubmodeEnum,
  type OtherSubmode,
  parseDistanceInput,
} from '@/lib/forms/journeySchemas';
import { buildOtherJourneyPatch } from '@/lib/journeys/buildJourneyPatch';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

import { DateField, TimeField } from '@/components/ui/DateField';
import { FormField, Segmented, TextField } from '@/components/ui/FormField';
import { TagInput } from '@/components/ui/TagInput';

const SUBMODE_OPTIONS: readonly { value: OtherSubmode; label: string }[] = [
  { value: 'walk', label: 'Walk' },
  { value: 'bike', label: 'Bike' },
  { value: 'other', label: 'Other' },
];

const todayIso = (): string => {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Free-text from/to are stored as ad-hoc address-type locations so journeys
// keep their fromLocationId/toLocationId FKs satisfied without forcing the
// user through a search modal for non-flight modes.
async function ensureAdhocLocation(label: string): Promise<string> {
  const trimmed = label.trim();
  const id = `adhoc:${trimmed.toLowerCase()}`;
  await db
    .insert(locations)
    .values({
      id,
      name: trimmed,
      type: 'address',
      lat: 0,
      lng: 0,
    })
    .onConflictDoNothing();
  return id;
}

// Legacy journeys created before the per-submode fix had mode='car'
// regardless of submode, with the real submode encoded in `source`
// ("manual:walk" etc.); we honor that on edit.
function submodeFromJourney(journey: JourneyWithRefs): OtherSubmode {
  if (journey.mode === 'walk') return 'walk';
  if (journey.mode === 'bike') return 'bike';
  if (journey.mode === 'other') return 'other';
  if (typeof journey.source === 'string') {
    const tail = journey.source.split(':')[1];
    if (tail === 'walk' || tail === 'bike' || tail === 'other') return tail;
  }
  return 'other';
}

export interface OtherFormProps {
  editing?: { journey: JourneyWithRefs; extras: JourneyExtras };
}

export function OtherForm({ editing }: OtherFormProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const isEdit = editing !== undefined;

  const [submitting, setSubmitting] = useState(false);

  const defaults: OtherFormValues = editing
    ? {
        submode: submodeFromJourney(editing.journey),
        fromText: editing.journey.fromLocation?.name ?? '',
        toText: editing.journey.toLocation?.name ?? '',
        date: editing.journey.date,
        startTimeLocal: editing.journey.startTimeLocal ?? undefined,
        endTimeLocal: editing.journey.endTimeLocal ?? undefined,
        distanceKm:
          editing.journey.distanceKm !== null && editing.journey.distanceKm !== undefined
            ? String(editing.journey.distanceKm)
            : undefined,
        notes: editing.journey.notes ?? undefined,
        photoUri: editing.extras.photoUris[0],
        tags: editing.extras.tags,
      }
    : {
        submode: 'other',
        fromText: '',
        toText: '',
        date: todayIso(),
        tags: [],
      };

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OtherFormValues>({
    resolver: zodResolver(otherFormSchema),
    defaultValues: defaults,
  });

  // `defaults`/`reset`/`editing` are deliberately omitted from deps — they
  // derive synchronously from `editing.journey.id`.
  useEffect(() => {
    if (editing) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.journey.id]);

  const photoUri = watch('photoUri');

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showSnackbar('Foto-Zugriff verweigert', { variant: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setValue('photoUri', result.assets[0].uri, { shouldDirty: true });
    }
  };

  const onSubmit = async (values: OtherFormValues) => {
    setSubmitting(true);
    try {
      const [fromId, toId] = await Promise.all([
        ensureAdhocLocation(values.fromText),
        ensureAdhocLocation(values.toText),
      ]);

      const journeyPatch = buildOtherJourneyPatch(values, {
        fromLocationId: fromId,
        toLocationId: toId,
        distanceKm: parseDistanceInput(values.distanceKm),
      });
      const photoUris = values.photoUri ? [values.photoUri] : [];

      await saveJourneyWithExtras(
        db,
        journeyPatch,
        { tags: values.tags, companions: [], photoUris },
        editing ? { editing: true, journeyId: editing.journey.id } : {},
      );

      showSnackbar(editing ? 'Reise aktualisiert' : 'Reise gespeichert', { variant: 'success' });
      router.back();
    } catch (err) {
      showSnackbar(
        err instanceof Error
          ? `Reise konnte nicht gespeichert werden: ${err.message}`
          : 'Reise konnte nicht gespeichert werden — deine Änderungen sind unverändert.',
        { variant: 'error' },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label="Modus" required>
          <Controller
            control={control}
            name="submode"
            render={({ field }) => (
              <Segmented
                value={field.value}
                onChange={(v) => field.onChange(otherSubmodeEnum.parse(v))}
                options={SUBMODE_OPTIONS}
              />
            )}
          />
        </FormField>

        <FormField label="Von" required error={errors.fromText?.message}>
          <Controller
            control={control}
            name="fromText"
            render={({ field }) => (
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                placeholder="z. B. Zuhause, Berlin"
                invalid={!!errors.fromText}
              />
            )}
          />
        </FormField>

        <FormField label="Nach" required error={errors.toText?.message}>
          <Controller
            control={control}
            name="toText"
            render={({ field }) => (
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                placeholder="z. B. Park, Berlin"
                invalid={!!errors.toText}
              />
            )}
          />
        </FormField>

        <FormField label="Datum" required error={errors.date?.message}>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DateField value={field.value} onChange={field.onChange} invalid={!!errors.date} />
            )}
          />
        </FormField>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField label="Startzeit">
              <Controller
                control={control}
                name="startTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="Endzeit">
              <Controller
                control={control}
                name="endTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
        </View>

        <FormField label="Distanz (km)" hint="Manuell, da GPS optional ist.">
          <Controller
            control={control}
            name="distanceKm"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="z. B. 12.5"
                keyboardType="decimal-pad"
              />
            )}
          />
        </FormField>

        <FormField label="Notizen" hint="Max. 500 Zeichen">
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="Kurze Beschreibung…"
                multiline
                numberOfLines={4}
                style={{ minHeight: 96, textAlignVertical: 'top' }}
                maxLength={500}
              />
            )}
          />
        </FormField>

        <FormField label="Foto">
          <Pressable
            onPress={pickPhoto}
            className="rounded-xl border border-border-dark bg-surface-dark p-4 active:opacity-80"
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 160, borderRadius: 8 }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-row items-center justify-center gap-2 py-6">
                <Ionicons name="image-outline" size={20} color={colors.text.muted} />
                <Text className="text-text-muted">Foto hinzufügen</Text>
              </View>
            )}
          </Pressable>
        </FormField>

        <FormField label="Tags">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput value={field.value} onChange={field.onChange} placeholder="Tag…" />
            )}
          />
        </FormField>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-dark bg-background-dark px-4"
        style={{ paddingTop: 12, paddingBottom: 12 + insets.bottom }}
      >
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`items-center rounded-full px-4 py-4 ${submitting ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Reise speichern'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
