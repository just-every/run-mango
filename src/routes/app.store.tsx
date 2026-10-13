import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { StorePage } from '@/core/features/store/ui/store-page';
export const Route = createFileRoute('/app/store')({component: editorLeaf(StorePage)});
