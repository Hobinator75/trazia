import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { listJourneysWithRefs, type JourneyWithRefs } from '@/db/repositories/journey.repository';
import { achievementUnlocks, locations, operators } from '@/db/schema';
import { loadAchievements } from '@/lib/achievements/engine';
import { aggregateStats, topRoutes, type StatsRefs } from '@/lib/stats';

const escape = (raw: string | null | undefined): string =>
  String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatKm = (km: number | null | undefined): string =>
  km !== null && km !== undefined && Number.isFinite(km)
    ? `${Math.round(km).toLocaleString('de-DE')} km`
    : '—';

const formatHours = (minutes: number | null | undefined): string =>
  minutes !== null && minutes !== undefined && Number.isFinite(minutes)
    ? `${(minutes / 60).toFixed(1)} h`
    : '—';

// Equirectangular projection from lat/lng to SVG viewBox 0..1000 / 0..500.
const projectToSvg = (lat: number, lng: number): { x: number; y: number } => ({
  x: ((lng + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

const arcPathFor = (j: JourneyWithRefs): string | null => {
  if (!j.fromLocation || !j.toLocation) return null;
  const a = projectToSvg(j.fromLocation.lat, j.fromLocation.lng);
  const b = projectToSvg(j.toLocation.lat, j.toLocation.lng);
  // Quadratic curve with a control point lifted off the great-circle midpoint
  // — pure cosmetic arc for the PDF cover.
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.18;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

const pinFor = (j: JourneyWithRefs): string => {
  let svg = '';
  for (const loc of [j.fromLocation, j.toLocation]) {
    if (!loc) continue;
    const p = projectToSvg(loc.lat, loc.lng);
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#3B82F6" />`;
  }
  return svg;
};

interface BuildHtmlInput {
  journeys: JourneyWithRefs[];
  refs: StatsRefs;
  username: string;
  unlockedIds: Set<string>;
  unlockedAtById: Map<string, Date | null>;
  rangeLabel: string;
}

function buildHtml({
  journeys,
  refs,
  username,
  unlockedIds,
  unlockedAtById,
  rangeLabel,
}: BuildHtmlInput): string {
  const stats = aggregateStats(journeys, refs);
  const top = topRoutes(journeys, 10);
  const labelById = new Map<string, string>();
  for (const j of journeys) {
    if (j.fromLocation)
      labelById.set(j.fromLocation.id, j.fromLocation.iata ?? j.fromLocation.name);
    if (j.toLocation) labelById.set(j.toLocation.id, j.toLocation.iata ?? j.toLocation.name);
  }

  const arcs = journeys.map(arcPathFor).filter((d): d is string => d !== null);
  const pins = journeys.map(pinFor).join('');
  const allAchievements = loadAchievements();

  const styles = `
    @page { size: A4; margin: 24mm 18mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0A0E1A; margin: 0; }
    h1 { font-size: 32px; margin: 0; }
    h2 { font-size: 18px; margin: 32px 0 12px; color: #1F2937; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .cover { padding: 40px 32px; background: linear-gradient(135deg, #3B82F6, #A78BFA); color: white; border-radius: 12px; }
    .cover h1 { color: white; }
    .cover .meta { margin-top: 8px; font-size: 14px; opacity: 0.9; }
    .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
    .stat { flex: 1 1 150px; background: #F3F4F6; border-radius: 8px; padding: 12px; }
    .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
    .stat-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    th { background: #F9FAFB; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
    .hero-map { background: #0A0E1A; border-radius: 12px; overflow: hidden; }
    .ach { display: inline-block; padding: 6px 10px; margin: 4px 4px 0 0; border-radius: 999px; background: #F3F4F6; font-size: 11px; }
    .ach.locked { color: #9CA3AF; }
    .ach.unlocked { background: #FEF3C7; color: #92400E; }
  `;

  const heroMap = `
    <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" width="100%" height="auto">
      <rect width="1000" height="500" fill="#0F172A" />
      ${arcs.map((d) => `<path d="${d}" fill="none" stroke="#A78BFA" stroke-width="1.5" opacity="0.7" />`).join('')}
      ${pins}
    </svg>
  `;

  const statTiles = `
    <div class="stats">
      <div class="stat"><div class="stat-label">Reisen</div><div class="stat-value">${stats.flightCount + stats.trainCount + stats.carCount + stats.shipCount + stats.otherCount}</div></div>
      <div class="stat"><div class="stat-label">Distanz</div><div class="stat-value">${formatKm(stats.totalKm)}</div></div>
      <div class="stat"><div class="stat-label">Stunden</div><div class="stat-value">${formatHours(stats.totalDurationMinutes)}</div></div>
      <div class="stat"><div class="stat-label">Länder</div><div class="stat-value">${stats.countriesVisited}</div></div>
      <div class="stat"><div class="stat-label">Erdumrundungen</div><div class="stat-value">${stats.earthRotations.toFixed(2)}×</div></div>
    </div>
  `;

  const topRows =
    top.length === 0
      ? '<tr><td colspan="3" style="color:#6B7280">Noch keine Routen erfasst.</td></tr>'
      : top
          .map(
            (r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escape(labelById.get(r.from) ?? r.from)} → ${escape(labelById.get(r.to) ?? r.to)}</td>
        <td>${r.count}× · ${formatKm(r.totalKm)}</td>
      </tr>
    `,
          )
          .join('');

  const achievementChips = allAchievements
    .filter((a) => !(a.hidden && !unlockedIds.has(a.id)))
    .map((a) => {
      const unlocked = unlockedIds.has(a.id);
      const unlockedAt = unlockedAtById.get(a.id) ?? null;
      const dateStr = unlocked && unlockedAt ? ` · ${unlockedAt.toLocaleDateString('de-DE')}` : '';
      return `<span class="ach ${unlocked ? 'unlocked' : 'locked'}">${escape(a.title)}${dateStr}</span>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${styles}</style>
      </head>
      <body>
        <div class="cover">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.12em; opacity:0.85;">Trazia · Reise-Bericht</div>
          <h1>${escape(username)}</h1>
          <div class="meta">${escape(rangeLabel)}</div>
        </div>

        <h2>Routen</h2>
        <div class="hero-map">${heroMap}</div>

        <h2>Statistik</h2>
        ${statTiles}

        <h2>Top 10 Routen</h2>
        <table>
          <thead><tr><th>#</th><th>Strecke</th><th>Häufigkeit · Distanz</th></tr></thead>
          <tbody>${topRows}</tbody>
        </table>

        <h2>Achievements</h2>
        <div>${achievementChips || '<span style="color:#6B7280">Noch keine Achievements freigeschaltet.</span>'}</div>

        <p style="margin-top:32px; font-size:10px; color:#6B7280;">
          Erstellt mit Trazia · ${escape(new Date().toLocaleString('de-DE'))}
        </p>
      </body>
    </html>
  `;
}

export interface PdfExportOptions {
  username?: string;
}

export async function exportPdf(opts: PdfExportOptions = {}): Promise<{ uri: string }> {
  const journeys = await listJourneysWithRefs(db);
  const allLocations = await db.select().from(locations);
  const allOperators = await db.select().from(operators);
  const allUnlocks = await db.select().from(achievementUnlocks);

  const refs: StatsRefs = {
    locationsById: new Map(allLocations.map((l) => [l.id, { id: l.id, country: l.country }])),
    operatorsById: new Map(allOperators.map((o) => [o.id, { id: o.id, name: o.name }])),
  };

  const dates = journeys
    .map((j) => j.date)
    .filter((d): d is string => Boolean(d))
    .sort();
  const rangeLabel =
    dates.length > 0 && dates[0] && dates[dates.length - 1]
      ? `${dates[0]} – ${dates[dates.length - 1]}`
      : 'Noch keine Reisen erfasst';

  const html = buildHtml({
    journeys,
    refs,
    username: opts.username ?? 'Trazia-Reisende:r',
    unlockedIds: new Set(allUnlocks.map((u) => u.achievementId)),
    unlockedAtById: new Map(allUnlocks.map((u) => [u.achievementId, u.unlockedAt ?? null])),
    rangeLabel,
  });

  const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });
  const today = new Date().toISOString().slice(0, 10);
  const finalUri = `${FileSystem.documentDirectory ?? ''}trazia-report-${today}.pdf`;
  try {
    await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  } catch {
    // moveAsync can fail across volumes; fall back to copying.
    await FileSystem.copyAsync({ from: tmpUri, to: finalUri });
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Trazia-Bericht teilen',
      UTI: 'com.adobe.pdf',
    });
  }
  return { uri: finalUri };
}
