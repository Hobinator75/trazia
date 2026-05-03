// Placeholder — implemented in Block 2 of the launch-fix session.
// Returning undefined here keeps the launch-blocker reproduction test
// failing with a clear assertion (180 vs undefined) instead of an
// import error that would mask the real behaviour.
export function computeDurationMinutes(
  _startTimeLocal: string | undefined,
  _endTimeLocal: string | undefined,
  _date: string,
): number | undefined {
  return undefined;
}
