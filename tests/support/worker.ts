import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { createFixturePlatform } from './local-platform';
import { createLocalApp } from './fixture-app';
import type { LocalAppBindings } from './fixture-app';

export default {
  fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
    return dispatchDocuments(request, bindings, executionContext, platform, createLocalApp(bindings, platform));
  },
} satisfies ExportedHandler<LocalAppBindings>;
