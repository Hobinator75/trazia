import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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

// Tag suggestions stay German for now — they're personal-shorthand strings
// that even an English-locale user may want to keep in German for their
// own travel diary. Revisit once we have product feedback on this.
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
  const { t } = useTranslation();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const isEdit = editing !== undefined;

  const cabinOptions: readonly { value: CabinClass; label: string }[] = [
    { value: 'economy', label: t('add_journey.cabin_economy') },
    { value: 'premium_economy', label: t('add_journey.cabin_premium_economy') },
    { value: 'business', label: t('add_journey.cabin_business') },
    { value: 'first', label: t('add_journey.cabin_first') },
  ];

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
      showSnackbar(t('add_journey.photo_perm_denied'), { variant: 'error' });
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
      const photoUris = values.photoUri ? [values.photoUri] : [];

      await saveJourneyWithExtras(
        db,
        journeyPatch,
        { tags: values.tags, companions: values.companions, photoUris },
        editing ? { editing: true, journeyId: editing.journey.id } : {},
      );

      // Bearing is computed for downstream features (route arrows etc.) but
      // not stored on the journey for now.
      if (from && to) {
        void initialBearing(
          { latitude: from.lat, longitude: from.lng },
          { latitude: to.lat, longitude: to.lng },
        );
      }

      showSnackbar(editing ? t('add_journey.updated') : t('add_journey.saved'), { variant: 'success' });
      router.back();
    } catch (err) {
      showSnackbar(
        err instanceof Error
          ? t('add_journey.save_failed_with_message', { message: err.message })
          : t('add_journey.save_failed_generic'),
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
        <FormField label={t('add_journey.label_from')} required error={errors.fromLocationId?.message}>
          <SelectButton
            value={fromLabel}
            placeholder={t('add_journey.ph_airport')}
            onPress={() => setModal({ kind: 'from' })}
            invalid={!!errors.fromLocationId}
          />
        </FormField>

        <FormField label={t('add_journey.label_to')} required error={errors.toLocationId?.message}>
          <SelectButton
            value={toLabel}
            placeholder={t('add_journey.ph_airport')}
            onPress={() => setModal({ kind: 'to' })}
            invalid={!!errors.toLocationId}
          />
        </FormField>

        <FormField label={t('add_journey.label_date')} required error={errors.date?.message}>
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
            <FormField label={t('add_journey.label_depart_local')}>
              <Controller
                control={control}
                name="startTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
          <View className="flex-1">
            <FormField label={t('add_journey.label_arrive_local')}>
              <Controller
                control={control}
                name="endTimeLocal"
                render={({ field }) => <TimeField value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </View>
        </View>

        <FormField label={t('add_journey.label_airline')} hint={t('add_journey.label_airline_hint')}>
          <SelectButton
            value={operatorLabel}
            placeholder={t('add_journey.ph_airline')}
            onPress={() => setModal({ kind: 'operator' })}
          />
        </FormField>

        <FormField label={t('add_journey.label_flight_number')}>
          <Controller
            control={control}
            name="serviceNumber"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder={t('add_journey.ph_flight_number')}
                autoCapitalize="characters"
              />
            )}
          />
        </FormField>

        <FormField label={t('add_journey.label_aircraft')}>
          <SelectButton
            value={vehicleLabel}
            placeholder={t('add_journey.ph_aircraft')}
            onPress={() => setModal({ kind: 'vehicle' })}
          />
        </FormField>

        <FormField label={t('add_journey.label_seat')}>
          <Controller
            control={control}
            name="seatNumber"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder={t('add_journey.ph_seat_flight')}
                autoCapitalize="characters"
              />
            )}
          />
        </FormField>

        <FormField label={t('add_journey.label_cabin')}>
          <Controller
            control={control}
            name="cabinClass"
            render={({ field }) => (
              <Segmented
                value={field.value}
                onChange={(v) => field.onChange(cabinClassEnum.parse(v))}
                options={cabinOptions}
              />
            )}
          />
        </FormField>

        <FormField label={t('add_journey.label_notes')} hint={t('add_journey.label_notes_hint')}>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextField
                value={field.value ?? ''}
                onChangeText={field.onChange}
                placeholder={t('add_journey.ph_notes')}
                multiline
                numberOfLines={4}
                style={{ minHeight: 96, textAlignVertical: 'top' }}
                maxLength={500}
              />
            )}
          />
        </FormField>

        <FormField label={t('add_journey.label_photo')}>
          <Pressable
            onPress={pickPhoto}
            className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 active:opacity-80"
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

        <FormField label={t('add_journey.label_companions')}>
          <Controller
            control={control}
            name="companions"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder={t('add_journey.ph_companion')}
              />
            )}
          />
        </FormField>

        <FormField label={t('add_journey.label_tags')}>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder={t('add_journey.ph_tag')}
                suggestions={TAG_SUGGESTIONS}
              />
            )}
          />
        </FormField>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-4"
        style={{ paddingTop: 12, paddingBottom: 12 + insets.bottom }}
      >
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`items-center rounded-full px-4 py-4 ${submitting ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? t('add_journey.save_busy') : isEdit ? t('add_journey.save_update') : t('add_journey.save_create')}
          </Text>
        </Pressable>
      </View>

      <EntitySearchModal<Location>
        visible={modal.kind === 'from'}
        title={t('add_journey.search_airport_from')}
        placeholder={t('add_journey.search_airport_placeholder')}
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
        title={t('add_journey.search_airport_to')}
        placeholder={t('add_journey.search_airport_placeholder')}
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
        title={t('add_journey.search_airline')}
        placeholder={t('add_journey.search_airline_placeholder')}
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
        title={t('add_journey.search_aircraft')}
        placeholder={t('add_journey.search_aircraft_placeholder')}
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
