import type { Feature } from '../copy';
import { Icon } from '../icons/Icon';
import { BodyText } from '../../site/BodyText';

/** A section's points: a round icon badge (sunny, or leaf-green for consent), a short serif title and one or two sentences. */
export function FeatureList({ items, tone = 'sun' }: { items: readonly Feature[]; tone?: 'sun' | 'leaf' }) {
  return (
    <ul className={`features features--${tone}`}>
      {items.map(({ icon, title, text }) => (
        <li key={title} className="feature">
          <span className="feature-badge"><Icon name={icon} /></span>
          <div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-text"><BodyText text={text} /></p>
          </div>
        </li>
      ))}
    </ul>
  );
}
