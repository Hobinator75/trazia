import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { journeyCompanions, journeyPhotos, journeyTags } from '@/db/schema';
import { createJourney } from '@/db/repositories/journey.repository';
import { getLocationById, searchLocations } from '@/db/repositories/location.repository';
import { searchOperators } from '@/db/repositories/operator.repository';
import { searchVehicles } from '@/db/repositories/vehicle.repository';
import type { Location, Operator, Vehicle } from '@/db/schema';
import { haversineDistance, initialBearing } from '@/lib/geo';
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

export function FlightForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalKind>({ kind: null });
  const [fromLabel, setFromLabel] = useState<string>();
  const [toLabel, setToLabel] = useState<string>();
  const [operatorLabel, setOperatorLabel] = useState<string>();
  const [vehicleLabel, setVehicleLabel] = useState<string>();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: {
      fromLocationId: '',
      toLocationId: '',
      date: todayIso(),
      companions: [],
      tags: [],
    },
  });

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

      const journey = await createJourney(db, {
        mode: 'flight',
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        date: values.date,
        startTimeLocal: values.startTimeLocal ?? null,
        endTimeLocal: values.endTimeLocal ?? null,
        operatorId: values.operatorId ?? null,
        vehicleId: values.vehicleId ?? null,
        serviceNumber: values.serviceNumber ?? null,
        seatNumber: values.seatNumber ?? null,
        cabinClass: values.cabinClass ?? null,
        distanceKm,
        routeType: 'great_circle',
        notes: values.notes ?? null,
        isManualEntry: true,
        source: 'manual',
      });

      if (values.companions.length > 0) {
        await db
          .insert(journeyCompanions)
          .values(
            values.companions.map((name) => ({ journeyId: journey.id, companionName: name })),
          );
      }
      if (values.tags.length > 0) {
        await db
          .insert(journeyTags)
          .values(values.tags.map((tag) => ({ journeyId: journey.id, tag })));
      }
      if (values.photoUri) {
        await db.insert(journeyPhotos).values({ journeyId: journey.id, photoUri: values.photoUri });
      }

      // Bearing is computed for downstream features (route arrows etc.) but
      // not stored on the journey for now.
      if (from && to) {
        void initialBearing(
          { latitude: from.lat, longitude: from.lng },
          { latitude: to.lat, longitude: to.lng },
        );
      }

      showSnackbar('Reise gespeichert', { variant: 'success' });
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

  const renderLocationLabel = (loc: Location): string =>
    [loc.iata, loc.name].filter(Boolean).join(' · ');

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
                resizeMode="cover"
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
            {submitting ? 'Speichern…' : 'Reise speichern'}
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
          setOperatorLabel(`${op.code ?? '—'} · ${op.name}`);
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
          setVehicleLabel(`${v.code ?? ''} · ${v.manufacturer ?? ''} ${v.model ?? ''}`.trim());
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
