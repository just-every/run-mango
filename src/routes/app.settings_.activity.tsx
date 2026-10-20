import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '@/core/features/auth/ui/activity-page';
export const Route = createFileRoute('/app/settings_/activity')({component: editorLeaf(ActivityPage)});
