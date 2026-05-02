// Builds assets/static/{airports,airlines}.json from public sources.
// Run with `npm run build:static-data` (Node 24 strips TS types natively).
//
// Sources:
// - OurAirports (CC0):     https://davidmegginson.github.io/ourairports-data/airports.csv
// - OpenFlights airlines:  https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat
//
// aircraft.json is curated by hand and not regenerated here.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(here, '..', 'assets', 'static');

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const AIRLINES_URL =
  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';

interface AirportRow {
  iata: string | null;
  icao: string | null;
  name: string;
  city: string | null;
  country: string;
  continent: string | null;
  lat: number;
  lng: number;
  elevation_ft: number | null;
  type: 'airport';
}

interface AirlineRow {
  iata: string;
  icao: string | null;
  name: string;
  callsign: string | null;
  country: string | null;
  modes: ['flight'];
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
}

// CSV parser that handles double-quoted fields with embedded commas and
// escaped quotes. Skips empty trailing line.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else if (c === '\r') {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function indexOf(header: string[], name: string): number {
  const idx = header.indexOf(name);
  if (idx === -1) throw new Error(`Column "${name}" not found in header: ${header.join(',')}`);
  return idx;
}

async function buildAirports(): Promise<AirportRow[]> {
  console.log('• Fetching OurAirports CSV…');
  const text = await fetchText(AIRPORTS_URL);
  const rows = parseCsv(text);
  const header = rows[0];
  if (!header) throw new Error('Empty airports CSV');

  const colType = indexOf(header, 'type');
  const colName = indexOf(header, 'name');
  const colLat = indexOf(header, 'latitude_deg');
  const colLng = indexOf(header, 'longitude_deg');
  const colElev = indexOf(header, 'elevation_ft');
  const colContinent = indexOf(header, 'continent');
  const colCountry = indexOf(header, 'iso_country');
  const colMunicipality = indexOf(header, 'municipality');
  const colScheduled = indexOf(header, 'scheduled_service');
  const colIcao = indexOf(header, 'gps_code');
  const colIata = indexOf(header, 'iata_code');

  const ALLOWED_TYPES = new Set(['large_airport', 'medium_airport']);
  const out: AirportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < header.length) continue;
    const type = r[colType];
    if (!type || !ALLOWED_TYPES.has(type)) continue;
    const scheduled = r[colScheduled];
    if (scheduled !== 'yes') continue;

    const iata = (r[colIata] ?? '').trim();
    const icao = (r[colIcao] ?? '').trim();
    const name = (r[colName] ?? '').trim();
    const country = (r[colCountry] ?? '').trim();
    const lat = Number.parseFloat(r[colLat] ?? '');
    const lng = Number.parseFloat(r[colLng] ?? '');
    if (!name || !country || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const elevRaw = (r[colElev] ?? '').trim();
    const elev = elevRaw.length > 0 ? Number.parseInt(elevRaw, 10) : null;

    out.push({
      iata: iata.length === 3 ? iata.toUpperCase() : null,
      icao: icao.length === 4 ? icao.toUpperCase() : null,
      name,
      city: (r[colMunicipality] ?? '').trim() || null,
      country: country.toUpperCase(),
      continent: (r[colContinent] ?? '').trim() || null,
      lat,
      lng,
      elevation_ft: Number.isFinite(elev) ? (elev as number) : null,
      type: 'airport',
    });
  }
  return out;
}

async function buildAirlines(): Promise<AirlineRow[]> {
  console.log('• Fetching OpenFlights airlines.dat…');
  const text = await fetchText(AIRLINES_URL);
  // airlines.dat has no header. Columns:
  //  id, name, alias, iata, icao, callsign, country, active
  const rows = parseCsv(text);

  // Dedup by IATA. When two airlines share an IATA code, prefer:
  //  1. the one with active='Y'
  //  2. otherwise the one whose name comes first alphabetically (deterministic)
  const byIata = new Map<string, AirlineRow & { active: boolean }>();

  for (const r of rows) {
    if (!r || r.length < 8) continue;
    const name = r[1]?.trim() ?? '';
    const iata = (r[3] ?? '').trim();
    const icao = (r[4] ?? '').trim();
    const callsign = (r[5] ?? '').trim();
    const country = (r[6] ?? '').trim();
    const active = (r[7] ?? '').trim() === 'Y';

    if (!active) continue;
    if (iata.length !== 2) continue;
    if (!name || name === '\\N') continue;

    const candidate: AirlineRow & { active: boolean } = {
      iata: iata.toUpperCase(),
      icao: icao.length === 3 ? icao.toUpperCase() : null,
      name,
      callsign: callsign && callsign !== '\\N' ? callsign : null,
      country: country && country !== '\\N' ? country : null,
      modes: ['flight'],
      active,
    };
    const existing = byIata.get(candidate.iata);
    if (!existing) {
      byIata.set(candidate.iata, candidate);
      continue;
    }
    if (existing.active && !candidate.active) continue;
    if (!existing.active && candidate.active) {
      byIata.set(candidate.iata, candidate);
      continue;
    }
    if (candidate.name.localeCompare(existing.name) < 0) {
      byIata.set(candidate.iata, candidate);
    }
  }

  return [...byIata.values()].map(({ active: _active, ...rest }) => rest);
}

async function main(): Promise<void> {
  const [airports, airlines] = await Promise.all([buildAirports(), buildAirlines()]);

  // Stable order so diffs are reviewable.
  airports.sort((a, b) => (a.iata ?? a.icao ?? a.name).localeCompare(b.iata ?? b.icao ?? b.name));
  airlines.sort((a, b) => a.iata.localeCompare(b.iata));

  const airportsPath = resolve(staticDir, 'airports.json');
  const airlinesPath = resolve(staticDir, 'airlines.json');
  writeFileSync(airportsPath, JSON.stringify(airports, null, 2) + '\n', 'utf8');
  writeFileSync(airlinesPath, JSON.stringify(airlines, null, 2) + '\n', 'utf8');

  console.log(`✓ ${airports.length} airports → ${airportsPath}`);
  console.log(`✓ ${airlines.length} airlines → ${airlinesPath}`);

  const required = ['FRA', 'MUC', 'BER', 'LHR', 'CDG', 'JFK', 'LAX', 'HND', 'NRT', 'SFO'];
  const missing = required.filter((iata) => !airports.some((a) => a.iata === iata));
  if (missing.length > 0) {
    console.error(`✗ Missing required IATA codes in airports: ${missing.join(', ')}`);
    process.exit(1);
  }
  const requiredAirlines = ['LH', 'BA', 'AF', 'KL', 'JL', 'NH', 'EK'];
  const missingAirlines = requiredAirlines.filter((c) => !airlines.some((a) => a.iata === c));
  if (missingAirlines.length > 0) {
    console.error(`✗ Missing required airline IATAs: ${missingAirlines.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
