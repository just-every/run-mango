import type { Plugin } from 'vite';

const moduleId = 'virtual:mango-private-preloads';
const resolvedModuleId = `\0${moduleId}`;
const assetHref = (fileName: string) => `/${fileName}`;

/** Static client imports for the private renderer; no dynamic imports or page data. */
export function privatePreloads(): Plugin {
  let graph: Record<string, string[]> | undefined;
  return {
    name: 'mango:private-preloads',
    enforce: 'post',
    generateBundle(_options, bundle) {
      if (this.environment.name !== 'client') return;
      graph = Object.fromEntries(Object.keys(bundle).sort().flatMap(fileName => {
        const chunk = bundle[fileName];
        if (chunk?.type !== 'chunk') return [];
        const imports = [...new Set(chunk.imports)]
          .filter(dependency => bundle[dependency]?.type === 'chunk')
          .sort().map(assetHref);
        return [[assetHref(chunk.fileName), imports] as const];
      }));
    },
    resolveId(id) {
      if (id === moduleId) return resolvedModuleId;
    },
    load(id) {
      if (id !== resolvedModuleId) return;
      if (this.environment.config.consumer !== 'server') {
        this.error('Private preload imports are available only to the server.');
      }
      if (this.environment.config.command === 'serve') return 'export default {};';
      if (!graph) this.error('Private preload imports require the completed client build.');
      return `export default ${JSON.stringify(graph)};`;
    },
  };
}
