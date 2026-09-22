const tz = "America/Chicago";
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz });
const dayYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });

export const fmtDay = (d: Date) => (d.getFullYear() === new Date().getFullYear() ? day : dayYear).format(d);
export const fmtDateTime = (d: Date) => dateTime.format(d);

export function ago(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const phoneFmt = (d: string | null) => (d && d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (d ?? ""));
