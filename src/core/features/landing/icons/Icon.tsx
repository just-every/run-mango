import { iconPaths, type IconName } from './iconPaths';

/** A decorative line icon (its feature title says what it means). */
export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {iconPaths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
