import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { SettingsWithUsage } from '@/core/features/insights/ui/settings-usage';
export const Route = createFileRoute('/app/settings')({component: editorLeaf(SettingsWithUsage)});
