import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
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
import { getLocationById, searchLocations } from '@/db/repositories/location.repository';
import { searchOperators } from '@/db/repositories/operator.repository';
import { searchVehicles } from '@/db/repositories/vehicle.repository';
import type { Location, Operator, Vehicle } from '@/db/schema';
import { haversineDistance } from '@/lib/geo';
import { buildTrainJourneyPatch } from '@/lib/journeys/buildJourneyPatch';
import {
  type TrainClass,
  type TrainFormValues,
  trainClassEnum,
  trainFormSchema,
} from '@/lib/forms/journeySchemas';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

import { DateField, TimeField } from '@/components/ui/DateField';
import { FormField, Segmented, SelectButton, TextField } from '@/components/ui/FormField';
import { TagInput } from '@/components/ui/TagInput';
import { EntitySearchModal } from '../EntitySearchModal';

const CLASS_OPTIONS: readonly { value: TrainClass; label: string }[] = [
  { value: 'second', label: '2. Klasse' },
  { value: 'first', label: '1. Klasse' },
  { value: 'sleeper', label: 'Schlafwagen' },
];

const TAG_SUGGESTIONS = ['Pendel', 'Urlaub', 'Familie'];

const todayIso = (): string => {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface ModalKind {
  kind: 'from' | 'to' | 'operator' | 'vehicle' | null;
}

const renderStationLabel = (loc: Location): string => loc.name;
const renderOperatorLabel = (op: Operator): string => `${op.code ?? '—'} · ${op.name}`;
const renderTrainLabel = (v: Vehicle): string =>
  `${v.code ?? ''} · ${v.manufacturer ?? ''} ${v.model ?? ''}`.trim();

export interface TrainFormProps {
  editing?: { journey: JourneyWithRefs; extras: JourneyExtras };
}

export function TrainForm({ editing }: TrainFormProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const isEdit = editing !== undefined;

  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalKind>({ kind: null });
  const [fromLabel, setFromLabel] = useState<string | undefined>(
    editing?.journey.fromLocation ? renderStationLabel(editing.journey.fromLocation) : undefined,
  );
  const [toLabel, setToLabel] = useState<string | undefined>(
    editing?.journey.toLocation ? renderStationLabel(editing.journey.toLocation) : undefined,
  );
  const [operatorLabel, setOperatorLabel] = useState<string | undefined>(
    editing?.journey.operator ? renderOperatorLabel(editing.journey.operator) : undefined,
  );
  const [vehicleLabel, setVehicleLabel] = useState<string | undefined>(
    editing?.journey.vehicle ? renderTrainLabel(editing.journey.vehicle) : undefined,
  );

  const defaults: TrainFormValues = editing
    ? {
        fromLocationId: editing.journey.fromLocationId,
        toLocationId: editing.journey.toLocationId,
        date: editing.journey.date,
        startTimeLocal: editing.journey.startTimeLocal ?? undefined,
        endTimeLocal: editing.journey.endTimeLocal ?? undefined,
        operatorId: editing.journey.operatorId,
        serviceNumber: editing.journey.serviceNumber ?? undefined,
        vehicleId: editing.journey.vehicleId,
        seatNumber: editing.journey.seatNumber ?? undefined,
        trainClass:
          editing.journey.cabinClass === 'second' ||
          editing.journey.cabinClass === 'first' ||
          editing.journey.cabinClass === 'sleeper'
            ? editing.journey.cabinClass
            : undefined,
        notes: editing.journey.notes ?? undefined,
        photoUri: editing.extras.photoUris[0],
        companions: editing.extras.companions,
        tags: editing.extras.tags,
      }
    : {
        fromLocationId: '',
        toLocationId: '',
        date: todayIso(),
        companions: [],
        tags: [],
      };

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TrainFormValues>({
    resolver: zodResolver(trainFormSchema),
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

  const onSubmit = async (values: TrainFormValues) => {
    setSubmitting(true);
    try {
      const [from, to] = await Promise.all([
        getLocationById(db, values.fromLocationId),
        getLocationById(db, values.toLocationId),
      ]);
      // Bezier route is fine for trains (great-circle would draw an arc that
      // bears no resemblance to the actual rail line). The shipping spec
      // accepts the visual approximation; "realistic routes" lands in Phase 3.
      const distanceKm =
        from && to
          ? Math.round(
              haversineDistance(
                { latitude: from.lat, longitude: from.lng },
                { latitude: to.lat, longitude: to.lng },
              ) * 10,
            ) / 10
          : null;

      const journeyPatch = buildTrainJourneyPatch(values, distanceKm);
      const photoUris = values.photoUri ? [values.photoUri] : [];

      await saveJourneyWithExtras(
        db,
        journeyPatch,
        { tags: values.tags, companions: values.companions, photoUris },
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

  const closeModal = () => setModal({ kind: null });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <FormField label="Von" required error={errors.fromLocationId?.message}>
          <SelectButton
            value={fromLabel}
            placeholder="Bahnhof wählen"
            onPress={() => setModal({ kind: 'from' })}
            invalid={!!errors.fromLocationId}
          />
        </FormField>

        <FormField label="Nach" required error={errors.toLocationId?.message}>
          <SelectButton
            value={toLabel}
            placeholder="Bahnhof wählen"
            onPress={() => setModal({ kind: 'to' })}
            invalid={!!errors.toLocationId}
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
            <FormField label="Abfahrt (lokal)">
              <Controller
                control={control}
                name="startTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="Ankunft (lokal)">
              <Controller
                control={control}
                name="endTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
        </View>

        <FormField
          label="Bahnbetreiber"
          hint="DB, ÖBB, SBB, SNCF — wird für Achievements ausgewertet."
        >
          <SelectButton
            value={operatorLabel}
            placeholder="Betreiber wählen"
            onPress={() => setModal({ kind: 'operator' })}
          />
        </FormField>

        <FormField label="Zugnummer / Service">
          <Controller
            control={control}
            name="serviceNumber"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="z. B. ICE 73"
                autoCapitalize="characters"
              />
            )}
          />
        </FormField>

        <FormField label="Zugmodell">
          <SelectButton
            value={vehicleLabel}
            placeholder="z. B. ICE 4"
            onPress={() => setModal({ kind: 'vehicle' })}
          />
        </FormField>

        <FormField label="Sitzplatz">
          <Controller
            control={control}
            name="seatNumber"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="z. B. Wagen 28, Platz 71"
              />
            )}
          />
        </FormField>

        <FormField label="Klasse">
          <Controller
            control={control}
            name="trainClass"
            render={({ field }) => (
              <Segmented
                value={field.value}
                onChange={(v) => field.onChange(trainClassEnum.parse(v))}
                options={CLASS_OPTIONS}
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
                placeholder="Was war besonders…"
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

        <FormField label="Begleitung">
          <Controller
            control={control}
            name="companions"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Name hinzufügen…"
              />
            )}
          />
        </FormField>

        <FormField label="Tags">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Tag hinzufügen…"
                suggestions={TAG_SUGGESTIONS}
              />
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
          className={`items-center rounded-full px-4 py-4 ${submitting ? 'bg-secondary/50' : 'bg-secondary active:opacity-80'}`}
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Reise speichern'}
          </Text>
        </Pressable>
      </View>

      <EntitySearchModal<Location>
        visible={modal.kind === 'from'}
        title="Abfahrtsbahnhof wählen"
        placeholder="Bahnhof oder Stadt…"
        onClose={closeModal}
        onSelect={(loc) => {
          setValue('fromLocationId', loc.id, { shouldValidate: true });
          setFromLabel(renderStationLabel(loc));
        }}
        search={(q) => searchLocations(db, q, 'train_station')}
        toResult={(loc) => ({
          id: loc.id,
          primary: loc.name,
          secondary: [loc.city, loc.country].filter(Boolean).join(', '),
          ...(loc.ibnr ? { tertiary: `IBNR ${loc.ibnr}` } : {}),
        })}
      />
      <EntitySearchModal<Location>
        visible={modal.kind === 'to'}
        title="Zielbahnhof wählen"
        placeholder="Bahnhof oder Stadt…"
        onClose={closeModal}
        onSelect={(loc) => {
          setValue('toLocationId', loc.id, { shouldValidate: true });
          setToLabel(renderStationLabel(loc));
        }}
        search={(q) => searchLocations(db, q, 'train_station')}
        toResult={(loc) => ({
          id: loc.id,
          primary: loc.name,
          secondary: [loc.city, loc.country].filter(Boolean).join(', '),
          ...(loc.ibnr ? { tertiary: `IBNR ${loc.ibnr}` } : {}),
        })}
      />
      <EntitySearchModal<Operator>
        visible={modal.kind === 'operator'}
        title="Bahnbetreiber wählen"
        placeholder="Name oder Code…"
        onClose={closeModal}
        onSelect={(op) => {
          setValue('operatorId', op.id, { shouldValidate: true });
          setOperatorLabel(renderOperatorLabel(op));
        }}
        search={(q) => searchOperators(db, q, 'train')}
        toResult={(op) => ({
          id: op.id,
          primary: `${op.code ? `${op.code} · ` : ''}${op.name}`,
          ...(op.country ? { secondary: op.country } : {}),
        })}
      />
      <EntitySearchModal<Vehicle>
        visible={modal.kind === 'vehicle'}
        title="Zugmodell wählen"
        placeholder="z. B. ICE 4, TGV…"
        onClose={closeModal}
        onSelect={(v) => {
          setValue('vehicleId', v.id, { shouldValidate: true });
          setVehicleLabel(renderTrainLabel(v));
        }}
        search={(q) => searchVehicles(db, q, 'train')}
        toResult={(v) => ({
          id: v.id,
          primary: `${v.code ?? ''} · ${v.model ?? ''}`.trim(),
          ...(v.manufacturer ? { secondary: v.manufacturer } : {}),
        })}
      />
    </KeyboardAvoidingView>
  );
}
