import { z } from 'zod';

export const cabinClassEnum = z.enum(['economy', 'premium_economy', 'business', 'first']);
export type CabinClass = z.infer<typeof cabinClassEnum>;

export const otherSubmodeEnum = z.enum(['walk', 'bike', 'other']);
export type OtherSubmode = z.infer<typeof otherSubmodeEnum>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalString = (max: number) => z.string().trim().max(max).optional();

export const flightFormSchema = z
  .object({
    fromLocationId: z.string().min(1, 'Bitte Abflugort wählen'),
    toLocationId: z.string().min(1, 'Bitte Zielort wählen'),
    date: z.string().regex(ISO_DATE_RE, 'Datum erforderlich (YYYY-MM-DD)'),
    startTimeLocal: optionalString(8),
    endTimeLocal: optionalString(8),
    operatorId: z.string().nullable().optional(),
    serviceNumber: optionalString(16),
    vehicleId: z.string().nullable().optional(),
    seatNumber: optionalString(8),
    cabinClass: cabinClassEnum.optional(),
    notes: optionalString(500),
    photoUri: optionalString(2048),
    companions: z.array(z.string().min(1)),
    tags: z.array(z.string().min(1)),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    path: ['toLocationId'],
    message: 'Ziel muss sich vom Abflugort unterscheiden',
  });

export type FlightFormValues = z.infer<typeof flightFormSchema>;

export const otherFormSchema = z.object({
  submode: otherSubmodeEnum,
  fromText: z.string().trim().min(1, 'Startpunkt erforderlich').max(120),
  toText: z.string().trim().min(1, 'Ziel erforderlich').max(120),
  date: z.string().regex(ISO_DATE_RE, 'Datum erforderlich (YYYY-MM-DD)'),
  startTimeLocal: optionalString(8),
  endTimeLocal: optionalString(8),
  distanceKm: z
    .string()
    .trim()
    .max(16)
    .optional()
    .refine(
      (v) =>
        v === undefined || v.length === 0 || !Number.isNaN(Number.parseFloat(v.replace(',', '.'))),
      { message: 'Distanz muss eine Zahl sein' },
    ),
  notes: optionalString(500),
  photoUri: optionalString(2048),
  tags: z.array(z.string().min(1)),
});

export type OtherFormValues = z.infer<typeof otherFormSchema>;

// Helper to coerce the optional distance string into a finite number or null.
export function parseDistanceInput(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(',', '.');
  if (trimmed.length === 0) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
