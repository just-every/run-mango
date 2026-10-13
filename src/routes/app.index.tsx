import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { DecisionDeskPage } from '@/core/features/campaigns/ui/decision-desk';
export const Route = createFileRoute('/app/')({component: editorLeaf(DecisionDeskPage)});
