// Compute the duration of a journey in whole minutes from local
// HH:mm timestamps. End < Start is treated as an overnight journey
// (the trip ends on the following calendar day).
//
// TODO: When the UI exposes IANA timezones (`startTimezone` /
// `endTimezone` are already in the schema), switch to a UTC-aware
// computation so cross-timezone journeys produce correct durations.
// Today the form only collects local clock time; assuming both times
// share a timezone is an explicit launch-time simplification.
export function computeDurationMinutes(
  startTimeLocal: string | undefined | null,
  endTimeLocal: string | undefined | null,
  _date: string,
): number | undefined {
  if (!startTimeLocal || !endTimeLocal) return undefined;
  const start = parseHHmm(startTimeLocal);
  const end = parseHHmm(endTimeLocal);
  if (start === null || end === null) return undefined;

  let diff = end - start;
  if (diff < 0) diff += 24 * 60; // overnight: end rolls into the next day
  return diff;
}

function parseHHmm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}
