/**
 * V1 launches in Nigeria only: every schedule is interpreted in Africa/Lagos
 * (WAT, UTC+1, no daylight saving). The API stores UTC instants.
 */
const OFFSET_MS = 60 * 60 * 1000;
export const LAGOS_LABEL = "WAT (Lagos)";

/** UTC instant -> a local Date whose wall-clock fields read as Lagos time. */
export function toLagosWall(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = new Date(d.getTime() + OFFSET_MS);
  return new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), s.getUTCHours(), s.getUTCMinutes(), s.getUTCSeconds());
}

/** Wall-clock Date (local fields read as Lagos time) -> UTC instant. */
export function fromLagosWall(wall: Date): Date {
  return new Date(Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes(), wall.getSeconds()) - OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** value for <input type="datetime-local"> in Lagos time. */
export function toLagosInput(value: string | Date): string {
  const w = toLagosWall(value);
  return `${w.getFullYear()}-${pad(w.getMonth() + 1)}-${pad(w.getDate())}T${pad(w.getHours())}:${pad(w.getMinutes())}`;
}

/** <input type="datetime-local"> value (Lagos time) -> UTC ISO string. */
export function fromLagosInput(input: string): string {
  const [date, time = "00:00"] = input.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - OFFSET_MS).toISOString();
}

/** Default schedule suggestion: tomorrow 09:00 Lagos time. */
export function defaultScheduleInput(): string {
  const w = toLagosWall(new Date());
  w.setDate(w.getDate() + 1);
  w.setHours(9, 0, 0, 0);
  return toLagosInput(fromLagosWall(w));
}
