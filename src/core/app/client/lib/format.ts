export function titleCase(value: string) {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDateInTimeZone(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date);
}

export function formatUtc(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date);
}

export function timeRemaining(value: string, now = Date.now()) {
  const milliseconds = new Date(value).getTime() - now;
  if (Number.isNaN(milliseconds)) return 'Time remaining is unavailable.';
  if (milliseconds <= 0) return 'The saved dispatch time has passed.';

  const minutes = Math.ceil(milliseconds / 60_000);
  if (minutes < 60) return `Dispatches in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `Dispatches in ${hours} hour${hours === 1 ? '' : 's'}.`;
  const days = Math.ceil(hours / 24);
  return `Dispatches in ${days} day${days === 1 ? '' : 's'}.`;
}
