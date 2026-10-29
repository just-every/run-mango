export function titleCase(value: string) {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
