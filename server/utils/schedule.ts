import { logger } from "./logger";

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type TimerHandle = ReturnType<typeof setTimeout> & {
  unref?: () => void;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
};

export const normalizeTimeZone = (value: unknown, fallback = "UTC") => {
  const candidate = String(value || fallback).trim() || fallback;
  try {
    getFormatter(candidate).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
};

const getZonedParts = (date: Date, timeZone: string): LocalDateTimeParts => {
  const partValues = new Map(
    getFormatter(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(partValues.get("year")),
    month: Number(partValues.get("month")),
    day: Number(partValues.get("day")),
    hour: Number(partValues.get("hour")),
    minute: Number(partValues.get("minute")),
    second: Number(partValues.get("second")),
  };
};

const localDateTimeToEpochMs = (parts: LocalDateTimeParts, timeZone: string) => {
  const localAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  let utcMs = localAsUtcMs - getTimeZoneOffsetMs(new Date(localAsUtcMs), timeZone);
  utcMs = localAsUtcMs - getTimeZoneOffsetMs(new Date(utcMs), timeZone);
  return utcMs;
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const dateMsWithoutMilliseconds = Math.trunc(date.getTime() / 1000) * 1000;
  return zonedAsUtcMs - dateMsWithoutMilliseconds;
};

const addLocalDays = (parts: LocalDateTimeParts, days: number) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const addLocalHours = (parts: LocalDateTimeParts, hours: number) => {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + hours),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
  };
};

const localComparableMs = (parts: LocalDateTimeParts) =>
  Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

export const getNextHourlyRun = (now: Date, timeZone: string) => {
  const zone = normalizeTimeZone(timeZone);
  const nowParts = getZonedParts(now, zone);
  const nextHour = addLocalHours(nowParts, 1);
  return new Date(
    localDateTimeToEpochMs(
      {
        ...nextHour,
        minute: 0,
        second: 0,
      },
      zone,
    ),
  );
};

export const getNextDailyRun = (
  now: Date,
  timeZone: string,
  hour = 8,
  minute = 0,
) => {
  const zone = normalizeTimeZone(timeZone);
  const nowParts = getZonedParts(now, zone);
  const todayTarget: LocalDateTimeParts = {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour,
    minute,
    second: 0,
  };

  const targetDate =
    localComparableMs(todayTarget) <= localComparableMs(nowParts)
      ? addLocalDays(todayTarget, 1)
      : todayTarget;

  return new Date(
    localDateTimeToEpochMs(
      {
        ...targetDate,
        hour,
        minute,
        second: 0,
      },
      zone,
    ),
  );
};

export const scheduleRecurringTask = (
  name: string,
  getNextRun: (now: Date) => Date,
  task: () => Promise<void>,
) => {
  let stopped = false;
  let timer: TimerHandle | undefined;

  const scheduleNext = () => {
    if (stopped) return;

    const now = new Date();
    const nextRun = getNextRun(now);
    const delayMs = Math.max(1000, nextRun.getTime() - now.getTime());
    logger.info("Task scheduled", { name, nextRun: nextRun.toISOString() });

    timer = setTimeout(async () => {
      if (stopped) return;

      try {
        await task();
      } finally {
        scheduleNext();
      }
    }, delayMs) as TimerHandle;

    timer.unref?.();
  };

  scheduleNext();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};
