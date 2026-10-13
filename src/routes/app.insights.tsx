import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { InsightsPage } from '@/core/features/insights/ui/insights-page';
export const Route = createFileRoute('/app/insights')({component: editorLeaf(InsightsPage)});
