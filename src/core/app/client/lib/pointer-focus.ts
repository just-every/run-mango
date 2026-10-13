/**
 * Pointer focus. A link, button or disclosure focused by a press of the pointer carries `data-pointer-focus` until it
 * loses focus or a key is pressed, so base.css can leave its ring off. Keyboard focus and focus moved by script (a
 * validation summary, a dialog, a test) never carry it and keep the ring. The browser's own :focus-visible gives no ring
 * to script focus that follows a click, so it cannot tell those two apart on its own.
 */
const controls = 'a[href], button, summary';

export function trackPointerFocus() {
  let pressed: Element | null = null;
  const press = (event: PointerEvent) => {
    pressed = event.target instanceof Element ? event.target.closest(controls) : null;
    // A press on the control that already has focus fires no focus event; it still takes the ring off.
    if (pressed && pressed === document.activeElement) pressed.setAttribute('data-pointer-focus', '');
    // A press focuses its control in the same task; a press that focuses nothing must not mark a later keyboard focus.
    setTimeout(() => { pressed = null; });
  };
  const focus = (event: FocusEvent) => { if (pressed && event.target === pressed) pressed.setAttribute('data-pointer-focus', ''); };
  const blur = (event: FocusEvent) => { if (event.target instanceof Element) event.target.removeAttribute('data-pointer-focus'); };
  const key = () => document.activeElement?.removeAttribute('data-pointer-focus');
  document.addEventListener('pointerdown', press, true);
  document.addEventListener('focusin', focus);
  document.addEventListener('focusout', blur);
  document.addEventListener('keydown', key, true);
  return () => {
    document.removeEventListener('pointerdown', press, true);
    document.removeEventListener('focusin', focus);
    document.removeEventListener('focusout', blur);
    document.removeEventListener('keydown', key, true);
  };
}
