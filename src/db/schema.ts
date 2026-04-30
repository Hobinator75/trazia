import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const operators = sqliteTable('operators', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  countryCode: text('country_code'),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  countryCode: text('country_code'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  iata: text('iata'),
  icao: text('icao'),
  uic: text('uic'),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const journeys = sqliteTable('journeys', {
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),
  fromLocationId: text('from_location_id')
    .notNull()
    .references(() => locations.id),
  toLocationId: text('to_location_id')
    .notNull()
    .references(() => locations.id),
  operatorId: text('operator_id').references(() => operators.id),
  departedAt: text('departed_at').notNull(),
  arrivedAt: text('arrived_at'),
  departedTz: text('departed_tz'),
  arrivedTz: text('arrived_tz'),
  distanceKm: real('distance_km'),
  notes: text('notes'),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  unlockedAt: text('unlocked_at'),
  progress: integer('progress').default(0).notNull(),
  target: integer('target').notNull(),
  payload: text('payload'),
});

export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Journey = typeof journeys.$inferSelect;
export type NewJourney = typeof journeys.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
