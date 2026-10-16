import {useEffect, type ComponentType} from 'react';
import {useRouterState} from '@tanstack/react-router';
import {installCompiledLiveEdits, setLiveEditsReady} from '@/vendor/base/editor/widget/live-edit-runtime';
import type {createOwnerEditor} from '@/vendor/base/editor';
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
  const initial = useRouterState({select: state => {
    const matches = state.matches as unknown as Array<{routeId: string; loaderData?: {resources?: Promise<Record<string, unknown>>}}>;
    return matches.find(match => match.routeId === '/app')?.loaderData?.resources;
  }});
  useEffect(() => {
    let editor: ReturnType<typeof createOwnerEditor> | undefined;
    const controller = new AbortController();
    let stopped = false;
    const revoke = () => {stopped = true; controller.abort(); editor?.setOwner(false);};
    const refresh = async (seed?: unknown) => {
      if (stopped) return;
      try {
        let eligibility: unknown = seed;
        if (eligibility === undefined) {
          const environment = await fetch('/auth/environment', {signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
          eligibility = environment.ok ? await environment.json() : undefined;
        }
        if (!eligibility || typeof eligibility !== 'object' || !('editorEligible' in eligibility) || eligibility.editorEligible !== true) {editor?.setOwner(false); return;}
        const response = await fetch('/api/editor/config', {signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
        if (!response.ok) {editor?.setOwner(false); return;}
        const grant: unknown = await response.json();
        if (stopped) return;
        // The ordinary operator path needs live edits, but the owner widget is
        // loaded only after current native eligibility and its grant succeed.
        if (!editor) {
          const module = await import('@/vendor/base/editor');
          if (stopped) return;
          editor = module.createOwnerEditor();
        }
        editor.setOwner(true);
        await editor.refresh(async () => grant);
      } catch {editor?.setOwner(false);}
    };
    const submit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && new URL(form.action).pathname === '/auth/signout') revoke();
    };
    document.addEventListener('submit', submit, true);
    window.addEventListener('mango-session-lost', revoke);
    void (async () => {
      const resources = await initial;
      await refresh(resources?.['/auth/environment']);
    })().catch(() => editor?.setOwner(false));
    const timer = setInterval(() => void refresh(), 20_000);
    return () => {
      revoke(); clearInterval(timer); editor?.dispose();
      document.removeEventListener('submit', submit, true);
      window.removeEventListener('mango-session-lost', revoke);
    };
  }, [path, initial]);
  return null;
}
