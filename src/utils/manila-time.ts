export const MANILA_TIME_ZONE = "Asia/Manila";

type ManilaCalendarParts = {
  year: number;
  month: number;
  day: number;
};

const apiInstantPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-](\d{2}):?(\d{2}))$/;
const calendarKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const manilaCalendarFormatter = new Intl.DateTimeFormat("en", {
  timeZone: MANILA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const manilaDateTimeFormatter = new Intl.DateTimeFormat("en", {
  timeZone: MANILA_TIME_ZONE,
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const utcMonthFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "UTC",
  month: "short",
});

function isValidCalendarDate(year: number, month: number, day: number) {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidApiInstant(value: string) {
  const match = apiInstantPattern.exec(value);
  if (!match) return false;

  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
    match[8] === undefined ? 0 : Number(match[8]),
    match[9] === undefined ? 0 : Number(match[9]),
  ];

  return (
    isValidCalendarDate(year, month, day) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  );
}

export function parseApiInstant(value: string) {
  if (!isValidApiInstant(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asValidDate(value: string | Date) {
  if (typeof value === "string") return parseApiInstant(value);
  return Number.isNaN(value.getTime()) ? null : value;
}

function manilaCalendarParts(value: string | Date): ManilaCalendarParts | null {
  const date = asValidDate(value);
  if (!date) return null;

  const parts = manilaCalendarFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  if (
    typeof values.year !== "number" ||
    typeof values.month !== "number" ||
    typeof values.day !== "number"
  ) {
    return null;
  }

  return { year: values.year, month: values.month, day: values.day };
}

function calendarDate(parts: ManilaCalendarParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function calendarKey(parts: ManilaCalendarParts) {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function calendarPartsFromKey(value: string) {
  const match = calendarKeyPattern.exec(value);
  if (!match) return null;

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidCalendarDate(parts.year, parts.month, parts.day) ? parts : null;
}

function addCalendarDays(parts: ManilaCalendarParts, days: number) {
  const next = calendarDate(parts);
  next.setUTCDate(next.getUTCDate() + days);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function weekStart(parts: ManilaCalendarParts) {
  return addCalendarDays(parts, -calendarDate(parts).getUTCDay());
}

function calendarDayDifference(
  later: ManilaCalendarParts,
  earlier: ManilaCalendarParts,
) {
  return Math.round(
    (calendarDate(later).getTime() - calendarDate(earlier).getTime()) /
      86_400_000,
  );
}

export function formatManilaDateTime(value: string) {
  const date = parseApiInstant(value);
  return date ? manilaDateTimeFormatter.format(date) : "Date unavailable";
}

export function formatManilaRelativeTime(value: string, reference = new Date()) {
  const date = parseApiInstant(value);
  if (!date || Number.isNaN(reference.getTime())) return "Date unavailable";

  const seconds = Math.round((date.getTime() - reference.getTime()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function isApiInstantExpired(value: string, reference = new Date()) {
  const date = parseApiInstant(value);
  return Boolean(
    date &&
      !Number.isNaN(reference.getTime()) &&
      date.getTime() <= reference.getTime(),
  );
}

export function isInManilaMonth(value: string, reference = new Date()) {
  const target = manilaCalendarParts(value);
  const current = manilaCalendarParts(reference);
  return Boolean(
    target &&
      current &&
      target.year === current.year &&
      target.month === current.month,
  );
}

export function manilaWeekStartKey(value: string) {
  const parts = manilaCalendarParts(value);
  return parts ? calendarKey(weekStart(parts)) : null;
}

export function formatManilaWeekRange(value: string | null) {
  const start = value ? calendarPartsFromKey(value) : null;
  if (!start) return "Date unavailable";

  const end = addCalendarDays(start, 6);
  const formatMonthDay = (parts: ManilaCalendarParts) => {
    const date = calendarDate(parts);
    return `${utcMonthFormatter.format(date)} ${date.getUTCDate()}`;
  };
  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
}

export function manilaNotificationGroupTitle(value: string, reference = new Date()) {
  const target = manilaCalendarParts(value);
  const current = manilaCalendarParts(reference);
  if (!target || !current) return "Older";

  const dayDifference = calendarDayDifference(current, target);
  if (dayDifference <= 0) return "Today";
  if (dayDifference === 1) return "Yesterday";

  const targetDay = calendarDate(target).getUTCDay();
  if (dayDifference <= 7 && (targetDay === 0 || targetDay === 6)) {
    return "Last weekend";
  }

  const weekDifference = calendarDayDifference(
    weekStart(current),
    weekStart(target),
  ) / 7;
  if (weekDifference === 0) return "This week";
  if (weekDifference === 1) return "Last week";
  if (dayDifference <= 31) return "Last month";
  return "Older";
}
