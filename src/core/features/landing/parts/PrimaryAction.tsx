import { ButtonLink } from '../../site/ButtonLink';
import { sitePaths } from '../../site/links';
import { useRunSite } from '../../site/run-site';
import { copy } from '../copy';

/** The landing's primary action: on the run site Run Mango opens the Run page; elsewhere it opens the install guide. */
export function PrimaryAction() {
  const runSite = useRunSite();
  return <ButtonLink to={runSite ? sitePaths.run : sitePaths.install} tone="sun">{runSite ? copy.hero.run : copy.hero.primary}</ButtonLink>;
}
