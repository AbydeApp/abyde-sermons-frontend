import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { toLagosWall } from "./lagos";

function toDate(value: string | Date): Date | null {
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

export function formatDate(value: string | Date | null | undefined, pattern = "EEE, MMM d") {
  if (!value) return "—";
  const d = toDate(value);
  return d ? format(toLagosWall(d), pattern) : "—";
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, "MMM d, h:mm a");
}

export function timeAgo(value: string | Date) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "";
}

/** Formats a millisecond offset, for example 95000 -> "1:35". */
export function formatTimestamp(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string | undefined) {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

export function initials(name: string | undefined) {
  if (!name) return "SF";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
