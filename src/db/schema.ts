import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { LocationKind, TransportMode } from '@/types/domain-types';

const uuid = () => globalThis.crypto.randomUUID();

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
};

export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    name: text('name').notNull(),
    city: text('city'),
    country: text('country'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    type: text('type').$type<LocationKind>().notNull(),
    iata: text('iata'),
    icao: text('icao'),
    ibnr: text('ibnr'),
    unlocode: text('unlocode'),
    ...timestamps,
  },
  (table) => [
    index('locations_iata_idx').on(table.iata),
    index('locations_icao_idx').on(table.icao),
    index('locations_ibnr_idx').on(table.ibnr),
    index('locations_unlocode_idx').on(table.unlocode),
    index('locations_type_idx').on(table.type),
  ],
);

export const operators = sqliteTable('operators', {
  id: text('id').primaryKey().$defaultFn(uuid),
  name: text('name').notNull(),
  code: text('code'),
  modes: text('modes', { mode: 'json' })
    .$type<TransportMode[]>()
    .notNull()
    .$defaultFn(() => []),
  country: text('country'),
  logoPath: text('logo_path'),
  ...timestamps,
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey().$defaultFn(uuid),
  mode: text('mode').$type<TransportMode>().notNull(),
  category: text('category'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  capacity: integer('capacity'),
  ...timestamps,
});

export const journeys = sqliteTable(
  'journeys',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    mode: text('mode').$type<TransportMode>().notNull(),
    fromLocationId: text('from_location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    toLocationId: text('to_location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    startTimeLocal: text('start_time_local'),
    endTimeLocal: text('end_time_local'),
    startTimezone: text('start_timezone'),
    endTimezone: text('end_timezone'),
    operatorId: text('operator_id').references(() => operators.id, {
      onDelete: 'set null',
    }),
    vehicleId: text('vehicle_id').references(() => vehicles.id, {
      onDelete: 'set null',
    }),
    serviceNumber: text('service_number'),
    cabinClass: text('cabin_class'),
    seatNumber: text('seat_number'),
    parentJourneyId: text('parent_journey_id').references((): AnySQLiteColumn => journeys.id, {
      onDelete: 'set null',
    }),
    distanceKm: real('distance_km'),
    durationMinutes: integer('duration_minutes'),
    routeType: text('route_type'),
    routePointsJson: text('route_points_json'),
    notes: text('notes'),
    rating: integer('rating'),
    weather: text('weather'),
    isManualEntry: integer('is_manual_entry', { mode: 'boolean' }).notNull().default(true),
    source: text('source'),
    ...timestamps,
  },
  (table) => [
    index('journeys_date_idx').on(table.date),
    index('journeys_mode_idx').on(table.mode),
    index('journeys_from_location_idx').on(table.fromLocationId),
    index('journeys_to_location_idx').on(table.toLocationId),
    index('journeys_operator_idx').on(table.operatorId),
  ],
);

export const journeyCompanions = sqliteTable(
  'journey_companions',
  {
    journeyId: text('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    companionName: text('companion_name').notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.journeyId, table.companionName] })],
);

export const journeyTags = sqliteTable(
  'journey_tags',
  {
    journeyId: text('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.journeyId, table.tag] })],
);

export const journeyPhotos = sqliteTable('journey_photos', {
  id: text('id').primaryKey().$defaultFn(uuid),
  journeyId: text('journey_id')
    .notNull()
    .references(() => journeys.id, { onDelete: 'cascade' }),
  photoUri: text('photo_uri').notNull(),
  ...timestamps,
});

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey().$defaultFn(uuid),
  name: text('name').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  coverPhotoUri: text('cover_photo_uri'),
  isPrivate: integer('is_private', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const tripJourneys = sqliteTable(
  'trip_journeys',
  {
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    journeyId: text('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.tripId, table.journeyId] })],
);

export const achievementUnlocks = sqliteTable(
  'achievement_unlocks',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    achievementId: text('achievement_id').notNull(),
    unlockedAt: integer('unlocked_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    triggeringJourneyId: text('triggering_journey_id').references(() => journeys.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [uniqueIndex('achievement_unlocks_achievement_id_unique').on(table.achievementId)],
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Journey = typeof journeys.$inferSelect;
export type NewJourney = typeof journeys.$inferInsert;
export type JourneyCompanion = typeof journeyCompanions.$inferSelect;
export type NewJourneyCompanion = typeof journeyCompanions.$inferInsert;
export type JourneyTag = typeof journeyTags.$inferSelect;
export type NewJourneyTag = typeof journeyTags.$inferInsert;
export type JourneyPhoto = typeof journeyPhotos.$inferSelect;
export type NewJourneyPhoto = typeof journeyPhotos.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripJourney = typeof tripJourneys.$inferSelect;
export type NewTripJourney = typeof tripJourneys.$inferInsert;
export type AchievementUnlock = typeof achievementUnlocks.$inferSelect;
export type NewAchievementUnlock = typeof achievementUnlocks.$inferInsert;
