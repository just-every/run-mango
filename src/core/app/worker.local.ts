import { dispatchDocuments } from './document-dispatch';
import { createLocalPlatform } from '@/core/platform/runtime';
import { createLocalApp } from './local-app';
import type { LocalAppBindings } from './local-app';

export default {
  fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    return dispatchDocuments(request, bindings, executionContext, createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY), createLocalApp(bindings));
  },
} satisfies ExportedHandler<LocalAppBindings>;
