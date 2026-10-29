import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const MenuContext = createContext<(notice: ReactNode) => void>(() => undefined);
/** An item whose outcome must outlive the click (a refused export, a refused copy) reports it here: the menu reopens on it. */
export const useMenuNotice = () => useContext(MenuContext);

/** The one place a page keeps its less-used actions beside the primary button. The items stay mounted while it is
 * closed, so a dialog an item owns survives the menu closing; a menu with no item for this role does not draw. */
export function ActionMenu({label = 'More actions', children}: {label?: string; children: ReactNode}) {
  const [open, setOpen] = useState(false), [empty, setEmpty] = useState(false), [notice, setNotice] = useState<ReactNode>(null);
  const root = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {setOpen(false); setNotice(null);}, []);
  const report = useCallback((next: ReactNode) => {setNotice(next); if (next) setOpen(true);}, []);
  useEffect(() => {setEmpty(!list.current?.querySelector('button,a'));});
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) close();};
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') {close(); toggle.current?.focus();}};
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', escape);};
  }, [open, close]);
  return <div ref={root} className="action-menu" hidden={empty} onBlur={event => {if (open && !root.current?.contains(event.relatedTarget as Node | null)) close();}}>
    <button ref={toggle} type="button" className="secondary-action action-menu__toggle" aria-expanded={open} aria-controls="action-menu-list" onClick={() => open ? close() : setOpen(true)}>{label}</button>
    <div className="action-menu__popover" hidden={!open}>
      <MenuContext.Provider value={report}>
        {/* Focus goes back to the toggle first, so a dialog an item opens returns focus to something that is drawn. */}
        <div ref={list} id="action-menu-list" className="action-menu__list" onClick={event => {if ((event.target as Element).closest('button:not([data-keep-open])')) {toggle.current?.focus(); close();}}}>{children}</div>
      </MenuContext.Provider>
      {open && notice ? <div className="action-menu__notice">{notice}</div> : null}
    </div>
  </div>;
}
