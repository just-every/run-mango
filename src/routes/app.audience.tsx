import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { AudiencePage } from '@/core/features/audience/ui/audience-page';
export const Route = createFileRoute('/app/audience')({component: editorLeaf(AudiencePage)});
