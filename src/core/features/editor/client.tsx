import {useEffect, type ComponentType} from 'react';
import {useRouterState} from '@tanstack/react-router';
import {createOwnerEditor, installCompiledLiveEdits, setLiveEditsReady} from '@/vendor/base/editor';
import {useEditorLeafReady} from '@/vendor/base/editor/react';
import compiled from '@/editor/visual-edits.json';

// Install before hydration. Route leaves release the DOM after their layout work.
if (typeof document !== 'undefined') {
  setLiveEditsReady(false);
  installCompiledLiveEdits(compiled);
}
export function editorLeaf(Component: ComponentType) {
  return function EditorLeaf() {
    const path = useRouterState({select: state => state.location.pathname});
    useEditorLeafReady(path);
    return <Component />;
  };
}
export function MangoEditor() {
  const path = useRouterState({select: state => state.location.pathname});
  useEffect(() => {
    const editor = createOwnerEditor(), controller = new AbortController();
    let stopped = false;
    const revoke = () => {stopped = true; controller.abort(); editor.setOwner(false);};
    const refresh = async () => {
      if (stopped) return;
      try {
        const environment = await fetch('/auth/environment', {signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
        const eligibility: unknown = environment.ok ? await environment.json() : undefined;
        if (!eligibility || typeof eligibility !== 'object' || !('editorEligible' in eligibility) || eligibility.editorEligible !== true) {editor.setOwner(false); return;}
        const response = await fetch('/api/editor/config', {signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
        if (!response.ok) {editor.setOwner(false); return;}
        const grant: unknown = await response.json();
        if (stopped) return;
        editor.setOwner(true);
        await editor.refresh(async () => grant);
      } catch {editor.setOwner(false);}
    };
    const submit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && new URL(form.action).pathname === '/auth/signout') revoke();
    };
    document.addEventListener('submit', submit, true);
    window.addEventListener('mango-session-lost', revoke);
    void refresh();
    const timer = setInterval(() => void refresh(), 20_000);
    return () => {
      revoke(); clearInterval(timer); editor.dispose();
      document.removeEventListener('submit', submit, true);
      window.removeEventListener('mango-session-lost', revoke);
    };
  }, [path]);
  return null;
}
