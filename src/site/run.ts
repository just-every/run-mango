import type { RunData } from '@/base/run-site';

/** Every string and command the run site's Run page (run-mango.com/run) shows. */
export const run: RunData = {
  name: 'Mango',
  repository: 'https://github.com/just-every/run-mango',
  clone: 'git clone https://github.com/just-every/run-mango.git mango',
  folder: 'mango',
  requirements: 'Needs Node 22 or later and pnpm 10.12.4, on macOS, Linux or Windows with WSL2.',
  licence: 'MIT',
  docs: true,
  hosted: [],
};
