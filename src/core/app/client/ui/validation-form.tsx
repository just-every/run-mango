import { Children, cloneElement, createContext, useContext, useEffect, useId, useRef, useState, type FormHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import type { FieldErrors } from './field-errors';

type Entry = {id: string; label: string; check: () => string | undefined; advisory: boolean};
type Validation = {errors: FieldErrors; register: (name: string, entry: Entry) => () => void; touch: (name: string) => void; change: (name: string) => void};
const NO_ERRORS: FieldErrors = {};
const Context = createContext<Validation | null>(null);
export function ValidationForm({children, onValidSubmit, serverErrors = NO_ERRORS, validationRequest = 0, ...props}: Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & {children: ReactNode; onValidSubmit: () => void; serverErrors?: FieldErrors; validationRequest?: number}) {
  const entries = useRef(new Map<string, Entry>());
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [reportedErrors, setReportedErrors] = useState(serverErrors);
  const [focusRequest, setFocusRequest] = useState(0), focusedRequest = useRef(0);
  const server = useRef<FieldErrors>(NO_ERRORS);
  const errors = {...clientErrors, ...reportedErrors};
  const register = useRef((name: string, entry: Entry) => {entries.current.set(name, entry); return () => {entries.current.delete(name);};}).current;
  const touch = (name: string) => {
    const message = entries.current.get(name)?.check();
    // An unchanged message keeps the same state, so live checks after every render settle.
    setClientErrors(previous => {if (previous[name] === message) return previous; const next = {...previous}; if (message) next[name] = message; else delete next[name]; return next;});
  };
  const change = (name: string) => setReportedErrors(previous => {
    if (!(name in previous)) return previous;
    const next = {...previous}; delete next[name]; return next;
  });
  const validate = () => {
    const next: FieldErrors = {}; let blocked = false;
    for (const [name, entry] of entries.current) {const message = entry.check(); if (message) {next[name] = message; if (!entry.advisory) blocked = true;}}
    setClientErrors(next);
    setFocusRequest(request => request + 1);
    return blocked;
  };
  useEffect(() => {
    const previous = server.current;
    server.current = serverErrors;
    if (previous === serverErrors || (!Object.keys(previous).length && !Object.keys(serverErrors).length)) return;
    // Clearing server feedback must not clear incomplete-draft guidance from the browser.
    setReportedErrors(serverErrors);
    if (Object.keys(serverErrors).length) setFocusRequest(request => request + 1);
  }, [serverErrors]);
  useEffect(() => {if (validationRequest) validate();}, [validationRequest]);
  const visible = Object.entries(errors).filter(([name]) => entries.current.has(name)).sort(([a], [b]) => {
    const first = document.getElementById(entries.current.get(a)!.id), second = document.getElementById(entries.current.get(b)!.id);
    return first && second && first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1;
  });
  useEffect(() => {
    if (focusedRequest.current === focusRequest || props['aria-busy'] === true || props['aria-busy'] === 'true') return;
    const first = visible[0], control = first && document.getElementById(entries.current.get(first[0])!.id);
    // A saving fieldset is disabled; restore focus once its controls are usable again.
    if (control?.matches(':disabled') || control?.getAttribute('aria-disabled') === 'true') return;
    control?.focus();
    focusedRequest.current = focusRequest;
  });
  return <Context.Provider value={{errors, register, touch, change}}><form {...props} noValidate onMouseDown={event => {
    props.onMouseDown?.(event);
    const submit = (event.target as Element).closest<HTMLButtonElement | HTMLInputElement>('button:not([type]), button[type="submit"], input[type="submit"], input[type="image"]');
    const active = document.activeElement;
    // Blur feedback can move the submit control between mouse down and click.
    // Keep field focus until native submission validates and focuses its errors.
    if (event.button === 0 && !event.defaultPrevented && submit?.form === event.currentTarget && active && [...entries.current.values()].some(entry => entry.id === active.id)) event.preventDefault();
  }} onSubmit={event => {
    // React bubbles a portalled dialog's submit to the form that rendered the dialog; it belongs to this form only.
    event.preventDefault(); event.stopPropagation();
    setReportedErrors(NO_ERRORS);
    if (!validate()) onValidSubmit();
  }}>{visible.length ? <div className="validation-summary" role="alert"><p>{visible.length} {visible.length === 1 ? 'field needs' : 'fields need'} attention.</p><ul>{visible.map(([name, message]) => {const entry = entries.current.get(name)!; return <li key={name}><a href={`#${entry.id}`} onClick={event => {event.preventDefault(); document.getElementById(entry.id)?.focus();}}>{entry.label}: {message}</a></li>;})}</ul></div> : null}{children}</form></Context.Provider>;
}

type Control = ReactElement<{id?: string; required?: boolean; onBlur?: (event: unknown) => void; onChange?: (event: unknown) => void; onInput?: (event: unknown) => void; 'aria-describedby'?: string; 'aria-label'?: string}>;
export function Field({name, label, children, validate, advisory = false, required = false, live = false}: {name: string; label: string; children: Control; validate?: () => string | undefined; advisory?: boolean; required?: boolean; live?: boolean}) {
  const context = useContext(Context), generated = useId(), check = useRef(validate), edited = useRef(false), [, recheck] = useState(0);
  const child = Children.only(children), id = child.props.id ?? `field-${generated.replaceAll(':', '')}`, errorId = `${id}-error`;
  check.current = validate;
  useEffect(() => context?.register(name, {id, label, advisory, check: () => {
    const custom = check.current?.(); if (custom) return custom;
    const element = document.getElementById(id) as HTMLInputElement | null;
    if (required && element && ('checked' in element && element.type === 'checkbox' ? !element.checked : !element.value?.trim())) return `Complete ${label.toLowerCase()}.`;
    if (element?.validity && !element.validity.valid) {if (element.validity.typeMismatch) return `Enter a valid ${element.type === 'email' ? 'email address' : label.toLowerCase()}.`; if (element.validity.rangeUnderflow || element.validity.rangeOverflow) return `Use a value between ${element.min} and ${element.max}.`; return `Check ${label.toLowerCase()}.`;}
    return undefined;
  }}), [context?.register, name, id, label, advisory, required]);
  const error = context?.errors[name];
  // A derived value such as a local time that cannot be resolved reports as it is typed, not only on blur;
  // a shown error is checked again after the field changes (an uncontrolled file input re-renders through
  // `recheck`), so choosing a file or fixing a value clears it at once.
  useEffect(() => {if ((live || error) && edited.current) context?.touch(name);});
  return <>{cloneElement(child, {id, 'aria-label': child.props['aria-label'] ?? (typeof child.type === 'string' && ['input','textarea','select'].includes(child.type) ? label : undefined), required: required || child.props.required, 'aria-invalid': error ? true : undefined, 'aria-describedby': [child.props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') || undefined, onBlur: (event: unknown) => {child.props.onBlur?.(event); context?.touch(name);}, onChange: (event: unknown) => {child.props.onChange?.(event); edited.current = true; context?.change(name); if (error) recheck(count => count + 1);}, onInput: (event: unknown) => {child.props.onInput?.(event); edited.current = true; context?.change(name); if (error) recheck(count => count + 1);}} as never)}{error ? <span id={errorId} className="field-error">{error}</span> : null}</>;
}
