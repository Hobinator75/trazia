// Phase-1 launch gates. The Train/Car/Ship code stays in the bundle so
// existing local data can still be displayed read-only and the engine
// remains correct cross-mode — but the entry points (ModePicker,
// onboarding, AddJourney) hide them until the next release branch.
//
// Flipping these to `true` re-enables the corresponding tab without
// re-introducing the missing seed data — for Phase 2/3, the train
// station catalogue still has to be expanded first (see
// RELEASE_CHECKLIST.md). A new EAS build is required after the flip.
export const FEATURE_FLAGS = {
  PHASE_2_TRAIN_VISIBLE: false,
  PHASE_3_CAR_VISIBLE: false,
  PHASE_4_SHIP_VISIBLE: false,
} as const;
