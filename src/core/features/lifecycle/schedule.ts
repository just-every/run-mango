type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const result = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  if (formatters.size >= 64) formatters.delete(formatters.keys().next().value!);
  formatters.set(timeZone,result);
  return result;
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function sameParts(left: LocalParts, right: LocalParts) {
  return Object.keys(left).every((key) => left[key as keyof LocalParts] === right[key as keyof LocalParts]);
}

export function resolveLocalInstant(localDateTime: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime);
  if (!match) return { status: 'invalid' as const, detail: 'Local time must use YYYY-MM-DDTHH:mm.' };
  try {
    if (/^[+-]/.test(timeZone)) throw new Error('An offset is not an IANA time zone.');
    formatter(timeZone);
  } catch {
    return { status: 'invalid' as const, detail: 'An IANA time zone is required.' };
  }
  const target: LocalParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const center = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  const matches: Date[] = [];
  for (let offsetMinutes = -14 * 60; offsetMinutes <= 14 * 60; offsetMinutes += 15) {
    const instant = new Date(center + offsetMinutes * 60_000);
    if (sameParts(localParts(instant, timeZone), target)) matches.push(instant);
  }
  if (matches.length === 0) {
    return { status: 'nonexistent' as const, detail: `${localDateTime} does not exist in ${timeZone}.` };
  }
  if (matches.length > 1) {
    return {
      status: 'ambiguous' as const,
      detail: `${localDateTime} occurs more than once in ${timeZone}; choose a resolved UTC instant.`,
      choices: matches.map((item) => item.toISOString()),
    };
  }
  return { status: 'resolved' as const, instant: matches[0].toISOString() };
}

export function isInsideSmsWindow(now: Date, timeZone: string, startHour = 9, endHour = 20) {
  const parts = localParts(now, timeZone);
  return parts.hour >= startHour && parts.hour < endHour;
}

export function nextSmsWindow(now: Date, timeZone: string, startHour = 9) {
  for (let minutes = 15; minutes <= 48 * 60; minutes += 15) {
    const candidate = new Date(now.getTime() + minutes * 60_000);
    const parts = localParts(candidate, timeZone);
    if (parts.hour === startHour && parts.minute === 0) return candidate;
  }
  throw new Error(`Unable to resolve the next SMS window for ${timeZone}.`);
}
