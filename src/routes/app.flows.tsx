import {editorLeaf} from '@/core/features/editor/client';
import {createFileRoute} from '@tanstack/react-router';
import {FlowsPage} from '@/core/features/flows/page';
export const Route=createFileRoute('/app/flows')({component:editorLeaf(FlowsPage)});
