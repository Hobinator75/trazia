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
import { journeyCompanions, journeyPhotos, journeyTags } from '@/db/schema';
import {
  createJourney,
  updateJourney,
  type JourneyExtras,
  type JourneyWithRefs,
} from '@/db/repositories/journey.repository';
import { getLocationById, searchLocations } from '@/db/repositories/location.repository';
import { searchOperators } from '@/db/repositories/operator.repository';
import { searchVehicles } from '@/db/repositories/vehicle.repository';
import { eq } from 'drizzle-orm';
import type { Location, Operator, Vehicle } from '@/db/schema';
import { haversineDistance, initialBearing } from '@/lib/geo';
import { buildFlightJourneyPatch } from '@/lib/journeys/buildJourneyPatch';
import {
  type CabinClass,
  type FlightFormValues,
  cabinClassEnum,
  flightFormSchema,
} from '@/lib/forms/journeySchemas';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { colors } from '@/theme/colors';

import { DateField, TimeField } from '@/components/ui/DateField';
import { FormField, Segmented, SelectButton, TextField } from '@/components/ui/FormField';
import { TagInput } from '@/components/ui/TagInput';
import { EntitySearchModal } from '../EntitySearchModal';

const CABIN_OPTIONS: readonly { value: CabinClass; label: string }[] = [
  { value: 'economy', label: 'Eco' },
  { value: 'premium_economy', label: 'Prem. Eco' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
];

const TAG_SUGGESTIONS = ['Geschäftsreise', 'Urlaub', 'Familie'];

const todayIso = (): string => {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface ModalKind {
  kind: 'from' | 'to' | 'operator' | 'vehicle' | null;
}

const renderLocationLabel = (loc: Location): string =>
  [loc.iata, loc.name].filter(Boolean).join(' · ');
const renderOperatorLabel = (op: Operator): string => `${op.code ?? '—'} · ${op.name}`;
const renderVehicleLabel = (v: Vehicle): string =>
  `${v.code ?? ''} · ${v.manufacturer ?? ''} ${v.model ?? ''}`.trim();

export interface FlightFormProps {
  // When provided, the form is in edit mode: defaults are taken from the
  // existing journey + extras and onSubmit will UPDATE rather than INSERT.
  editing?: { journey: JourneyWithRefs; extras: JourneyExtras };
}

export function FlightForm({ editing }: FlightFormProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const isEdit = editing !== undefined;

  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalKind>({ kind: null });
  const [fromLabel, setFromLabel] = useState<string | undefined>(
    editing?.journey.fromLocation ? renderLocationLabel(editing.journey.fromLocation) : undefined,
  );
  const [toLabel, setToLabel] = useState<string | undefined>(
    editing?.journey.toLocation ? renderLocationLabel(editing.journey.toLocation) : undefined,
  );
  const [operatorLabel, setOperatorLabel] = useState<string | undefined>(
    editing?.journey.operator ? renderOperatorLabel(editing.journey.operator) : undefined,
  );
  const [vehicleLabel, setVehicleLabel] = useState<string | undefined>(
    editing?.journey.vehicle ? renderVehicleLabel(editing.journey.vehicle) : undefined,
  );

  const defaults: FlightFormValues = editing
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
        cabinClass:
          editing.journey.cabinClass &&
          (editing.journey.cabinClass === 'economy' ||
            editing.journey.cabinClass === 'premium_economy' ||
            editing.journey.cabinClass === 'business' ||
            editing.journey.cabinClass === 'first')
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
  } = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: defaults,
  });

  // Reset form when the editing target changes. `defaults`/`reset`/`editing`
  // are deliberately omitted from deps — they derive synchronously from
  // `editing.journey.id` so re-running on every render would either be a
  // no-op or wipe in-progress edits.
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

  const onSubmit = async (values: FlightFormValues) => {
    setSubmitting(true);
    try {
      const [from, to] = await Promise.all([
        getLocationById(db, values.fromLocationId),
        getLocationById(db, values.toLocationId),
      ]);
      const distanceKm =
        from && to
          ? Math.round(
              haversineDistance(
                { latitude: from.lat, longitude: from.lng },
                { latitude: to.lat, longitude: to.lng },
              ) * 10,
            ) / 10
          : null;

      const journeyPatch = buildFlightJourneyPatch(values, distanceKm);

      let journeyId: string;
      if (editing) {
        await updateJourney(db, editing.journey.id, journeyPatch);
        journeyId = editing.journey.id;
        // Edit-mode: replace child collections wholesale. Cheaper than
        // diff-and-merge and keeps the form simple.
        await db.delete(journeyCompanions).where(eq(journeyCompanions.journeyId, journeyId));
        await db.delete(journeyTags).where(eq(journeyTags.journeyId, journeyId));
        await db.delete(journeyPhotos).where(eq(journeyPhotos.journeyId, journeyId));
      } else {
        const journey = await createJourney(db, journeyPatch);
        journeyId = journey.id;
      }

      if (values.companions.length > 0) {
        await db
          .insert(journeyCompanions)
          .values(values.companions.map((name) => ({ journeyId, companionName: name })));
      }
      if (values.tags.length > 0) {
        await db.insert(journeyTags).values(values.tags.map((tag) => ({ journeyId, tag })));
      }
      if (values.photoUri) {
        await db.insert(journeyPhotos).values({ journeyId, photoUri: values.photoUri });
      }

      // Bearing is computed for downstream features (route arrows etc.) but
      // not stored on the journey for now.
      if (from && to) {
        void initialBearing(
          { latitude: from.lat, longitude: from.lng },
          { latitude: to.lat, longitude: to.lng },
        );
      }

      showSnackbar(editing ? 'Reise aktualisiert' : 'Reise gespeichert', { variant: 'success' });
      router.back();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Fehler beim Speichern', {
        variant: 'error',
      });
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
            placeholder="Flughafen wählen"
            onPress={() => setModal({ kind: 'from' })}
            invalid={!!errors.fromLocationId}
          />
        </FormField>

        <FormField label="Nach" required error={errors.toLocationId?.message}>
          <SelectButton
            value={toLabel}
            placeholder="Flughafen wählen"
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
            <FormField label="Abflugzeit (lokal)">
              <Controller
                control={control}
                name="startTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label="Ankunftszeit (lokal)">
              <Controller
                control={control}
                name="endTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
        </View>

        <FormField label="Airline" hint="Empfohlen — wird für Achievements ausgewertet.">
          <SelectButton
            value={operatorLabel}
            placeholder="Airline wählen"
            onPress={() => setModal({ kind: 'operator' })}
          />
        </FormField>

        <FormField label="Flugnummer">
          <Controller
            control={control}
            name="serviceNumber"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder="z. B. LH441"
                autoCapitalize="characters"
              />
            )}
          />
        </FormField>

        <FormField label="Aircraft-Type">
          <SelectButton
            value={vehicleLabel}
            placeholder="Aircraft wählen"
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
                placeholder="z. B. 23A"
                autoCapitalize="characters"
              />
            )}
          />
        </FormField>

        <FormField label="Kabinenklasse">
          <Controller
            control={control}
            name="cabinClass"
            render={({ field }) => (
              <Segmented
                value={field.value}
                onChange={(v) => field.onChange(cabinClassEnum.parse(v))}
                options={CABIN_OPTIONS}
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
          className={`items-center rounded-full px-4 py-4 ${submitting ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Reise speichern'}
          </Text>
        </Pressable>
      </View>

      <EntitySearchModal<Location>
        visible={modal.kind === 'from'}
        title="Abflug wählen"
        placeholder="Flughafen, Stadt oder IATA…"
        onClose={closeModal}
        onSelect={(loc) => {
          setValue('fromLocationId', loc.id, { shouldValidate: true });
          setFromLabel(renderLocationLabel(loc));
        }}
        search={(q) => searchLocations(db, q, 'airport')}
        toResult={(loc) => ({
          id: loc.id,
          primary: `${loc.iata ? `${loc.iata} · ` : ''}${loc.name}`,
          secondary: [loc.city, loc.country].filter(Boolean).join(', '),
          ...(loc.icao ? { tertiary: loc.icao } : {}),
        })}
      />
      <EntitySearchModal<Location>
        visible={modal.kind === 'to'}
        title="Ziel wählen"
        placeholder="Flughafen, Stadt oder IATA…"
        onClose={closeModal}
        onSelect={(loc) => {
          setValue('toLocationId', loc.id, { shouldValidate: true });
          setToLabel(renderLocationLabel(loc));
        }}
        search={(q) => searchLocations(db, q, 'airport')}
        toResult={(loc) => ({
          id: loc.id,
          primary: `${loc.iata ? `${loc.iata} · ` : ''}${loc.name}`,
          secondary: [loc.city, loc.country].filter(Boolean).join(', '),
          ...(loc.icao ? { tertiary: loc.icao } : {}),
        })}
      />
      <EntitySearchModal<Operator>
        visible={modal.kind === 'operator'}
        title="Airline wählen"
        placeholder="Name oder IATA-Code…"
        onClose={closeModal}
        onSelect={(op) => {
          setValue('operatorId', op.id, { shouldValidate: true });
          setOperatorLabel(renderOperatorLabel(op));
        }}
        search={(q) => searchOperators(db, q, 'flight')}
        toResult={(op) => ({
          id: op.id,
          primary: `${op.code ? `${op.code} · ` : ''}${op.name}`,
          ...(op.country ? { secondary: op.country } : {}),
        })}
      />
      <EntitySearchModal<Vehicle>
        visible={modal.kind === 'vehicle'}
        title="Aircraft wählen"
        placeholder="ICAO-Code oder Modell…"
        onClose={closeModal}
        onSelect={(v) => {
          setValue('vehicleId', v.id, { shouldValidate: true });
          setVehicleLabel(renderVehicleLabel(v));
        }}
        search={(q) => searchVehicles(db, q, 'flight')}
        toResult={(v) => ({
          id: v.id,
          primary: `${v.code ?? ''} · ${v.model ?? ''}`.trim(),
          ...(v.manufacturer ? { secondary: v.manufacturer } : {}),
        })}
      />
    </KeyboardAvoidingView>
  );
}
