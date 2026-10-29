import { setTimeZone, useTimeZone, zoneChoices } from '../lib/time-zone';

/** The one place a time zone is named: every time on the app is shown in it. */
export function TimeZonePicker() {
  const zone = useTimeZone();
  return <label className="time-zone-picker">Times shown in
    <select value={zone} onChange={event => setTimeZone(event.target.value)}>
      {zoneChoices(zone).map(name => <option key={name} value={name}>{name.replaceAll('_', ' ')}</option>)}
    </select>
  </label>;
}
