// A test-only server clock: production routes still construct their own Date and
// read their real D1 data. Browser time cannot supply this boundary proof.
const NativeDate = Date;
let instant: number | null = null;
globalThis.Date = new Proxy(NativeDate, {
  construct(target, args) {
    return Reflect.construct(target, args.length ? args : [instant ?? NativeDate.now()]);
  },
  apply() { return new NativeDate(instant ?? NativeDate.now()).toString(); },
  get(target, key, receiver) {
    return key === 'now' ? () => instant ?? NativeDate.now() : Reflect.get(target, key, receiver);
  },
});
export function setRetentionClock(at: number | null) { instant = at; }
