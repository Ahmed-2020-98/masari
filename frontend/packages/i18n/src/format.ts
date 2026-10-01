/** Arabic (Saudi) formatting with Latin digits, matching the brand's dashboard mockups. */
const LOCALE = "ar-SA-u-nu-latn-ca-gregory";

const dateTime = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const date = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });
const number = new Intl.NumberFormat("en-US");
const relative = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

export const formatDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : "—");
export const formatDate = (iso?: string | null) => (iso ? date.format(new Date(iso)) : "—");
export const formatShortDate = (iso?: string | null) => (iso ? shortDate.format(new Date(iso)) : "—");
export const formatMonth = (yyyyMm: string) => monthYear.format(new Date(`${yyyyMm}-01T00:00:00`));
export const formatNumber = (value: number) => number.format(value);

export function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "الآن";
}

/** Display a Saudi E.164 number as 05X XXX XXXX. */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  const local = phone.replace(/^\+966/, "0");
  return local.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}
