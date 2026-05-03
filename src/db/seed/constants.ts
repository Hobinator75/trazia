// Single source of truth for seed-version metadata. Bumped whenever the
// shipped catalogue (airports / airlines / aircraft / train stations /
// railway operators / trains) changes in a way the device must reload.
//
// History:
//   v1: initial seed (~8 demo airports/airlines).
//   v2: full OurAirports + OpenFlights catalogues (3000+ airports, 900+
//       airlines, 150 aircraft).
//   v3: train stack added (Phase 8.1 — 124 stations, 51 operators,
//       75 train models).
export const SEED_VERSION = '3';
export const SEED_VERSION_KEY = 'seed.version';
