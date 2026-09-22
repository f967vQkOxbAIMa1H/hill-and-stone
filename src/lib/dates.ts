// Business-day math in the shop's time zone (Central). Holidays are not accounted for.
const TZ = "America/Chicago";

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
    if (weekday !== "Sat" && weekday !== "Sun") added++;
  }
  return d;
}

export function formatDay(d: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(d);
}
