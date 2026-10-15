/** No provider request was made. A caller may release a one-shot fence safely. */
export class ProviderDeferredError extends Error {
  readonly name='ProviderDeferredError';
  constructor(readonly retryAt:Date,readonly code='provider-pacing') {super(code);}
}
