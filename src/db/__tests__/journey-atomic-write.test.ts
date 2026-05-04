import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getJourneyExtras,
  getJourneyById,
  saveJourneyWithExtras,
} from '../repositories/journey.repository';
import { journeyCompanions, journeyPhotos, journeyTags, journeys, locations } from '../schema';
import { createTestDb } from './test-db';

const NO_NOTIFY_NO_ADS = {
  evaluateAchievements: true,
  notify: false,
  triggerInterstitial: false,
} as const;

describe('saveJourneyWithExtras (atomic submit)', () => {
  let handle: ReturnType<typeof createTestDb>;
  let fraId: string;
  let jfkId: string;

  beforeEach(async () => {
    handle = createTestDb();
    await handle.db.insert(locations).values([
      {
        name: 'Frankfurt Airport',
        city: 'Frankfurt',
        country: 'DE',
        lat: 50.0379,
        lng: 8.5622,
        type: 'airport',
        iata: 'FRA',
        icao: 'EDDF',
        isSystemSeed: true,
      },
      {
        name: 'JFK',
        city: 'New York',
        country: 'US',
        lat: 40.6413,
        lng: -73.7781,
        type: 'airport',
        iata: 'JFK',
        icao: 'KJFK',
        isSystemSeed: true,
      },
    ]);
    const fra = await handle.db.select().from(locations).where(eq(locations.iata, 'FRA'));
    const jfk = await handle.db.select().from(locations).where(eq(locations.iata, 'JFK'));
    fraId = fra[0]!.id;
    jfkId = jfk[0]!.id;
  });

  afterEach(() => {
    handle.close();
  });

  it('CREATE happy path: journey + tags + photos + companions all land', async () => {
    const result = await saveJourneyWithExtras(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        isManualEntry: true,
      },
      {
        tags: ['Urlaub', 'Familie'],
        companions: ['Anna', 'Bob'],
        photoUris: ['file:///tmp/p1.jpg'],
      },
      NO_NOTIFY_NO_ADS,
    );

    const reloaded = await getJourneyById(handle.db, result.id);
    expect(reloaded).toBeDefined();

    const extras = await getJourneyExtras(handle.db, result.id);
    expect(extras.tags.sort()).toEqual(['Familie', 'Urlaub']);
    expect(extras.companions.sort()).toEqual(['Anna', 'Bob']);
    expect(extras.photoUris).toEqual(['file:///tmp/p1.jpg']);
  });

  it('CREATE rolls back the journey if a child insert fails', async () => {
    // Force a tag insert to violate the journey_tags PK (journeyId, tag)
    // by passing duplicate tags. The constraint fires only once the row
    // is inserted, which is exactly the kind of mid-stream failure we
    // want to roll back.
    await expect(
      saveJourneyWithExtras(
        handle.db,
        {
          mode: 'flight',
          fromLocationId: fraId,
          toLocationId: jfkId,
          date: '2026-04-15',
          isManualEntry: true,
        },
        {
          tags: ['Urlaub', 'Urlaub'], // PK violation: duplicate (journeyId, tag)
          companions: [],
          photoUris: [],
        },
        NO_NOTIFY_NO_ADS,
      ),
    ).rejects.toThrow();

    const allJourneys = await handle.db.select().from(journeys);
    expect(allJourneys).toHaveLength(0);
    const allTags = await handle.db.select().from(journeyTags);
    expect(allTags).toHaveLength(0);
  });

  it('EDIT rolls back: original tags/photos/companions remain when a new child insert fails', async () => {
    const created = await saveJourneyWithExtras(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        isManualEntry: true,
      },
      {
        tags: ['original-a', 'original-b'],
        companions: ['Alice'],
        photoUris: ['file:///tmp/orig.jpg'],
      },
      NO_NOTIFY_NO_ADS,
    );

    // Try to "edit" with duplicate tags — must throw and leave original
    // children untouched (delete + insert was wrapped in a transaction).
    await expect(
      saveJourneyWithExtras(
        handle.db,
        {
          mode: 'flight',
          fromLocationId: fraId,
          toLocationId: jfkId,
          date: '2026-05-15',
          isManualEntry: true,
        },
        {
          tags: ['new-x', 'new-x'], // duplicate triggers PK violation
          companions: ['Bob'],
          photoUris: [],
        },
        { ...NO_NOTIFY_NO_ADS, editing: true, journeyId: created.id },
      ),
    ).rejects.toThrow();

    // Journey must be unchanged + original children preserved.
    const reloaded = await getJourneyById(handle.db, created.id);
    expect(reloaded?.date).toBe('2026-04-15');
    const extras = await getJourneyExtras(handle.db, created.id);
    expect(extras.tags.sort()).toEqual(['original-a', 'original-b']);
    expect(extras.companions).toEqual(['Alice']);
    expect(extras.photoUris).toEqual(['file:///tmp/orig.jpg']);
  });

  it('EDIT happy path: child collections are replaced wholesale', async () => {
    const created = await saveJourneyWithExtras(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-04-15',
        isManualEntry: true,
      },
      { tags: ['old'], companions: ['Old'], photoUris: ['file:///tmp/old.jpg'] },
      NO_NOTIFY_NO_ADS,
    );

    await saveJourneyWithExtras(
      handle.db,
      {
        mode: 'flight',
        fromLocationId: fraId,
        toLocationId: jfkId,
        date: '2026-05-15',
        isManualEntry: true,
      },
      { tags: ['new-1', 'new-2'], companions: ['New'], photoUris: ['file:///tmp/new.jpg'] },
      { ...NO_NOTIFY_NO_ADS, editing: true, journeyId: created.id },
    );

    const reloaded = await getJourneyById(handle.db, created.id);
    expect(reloaded?.date).toBe('2026-05-15');
    const extras = await getJourneyExtras(handle.db, created.id);
    expect(extras.tags.sort()).toEqual(['new-1', 'new-2']);
    expect(extras.companions).toEqual(['New']);
    expect(extras.photoUris).toEqual(['file:///tmp/new.jpg']);

    const photoRows = await handle.db
      .select()
      .from(journeyPhotos)
      .where(eq(journeyPhotos.journeyId, created.id));
    expect(photoRows).toHaveLength(1);
    const companionRows = await handle.db
      .select()
      .from(journeyCompanions)
      .where(eq(journeyCompanions.journeyId, created.id));
    expect(companionRows).toHaveLength(1);
  });

  it('CREATE rolls back when journey insert itself throws (e.g. invalid FK)', async () => {
    await expect(
      saveJourneyWithExtras(
        handle.db,
        {
          mode: 'flight',
          fromLocationId: 'not-a-real-id',
          toLocationId: jfkId,
          date: '2026-04-15',
          isManualEntry: true,
        },
        { tags: [], companions: [], photoUris: [] },
        NO_NOTIFY_NO_ADS,
      ),
    ).rejects.toThrow();

    const allJourneys = await handle.db.select().from(journeys);
    expect(allJourneys).toHaveLength(0);
  });
});
