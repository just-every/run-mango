import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';

import { AudienceImportPage } from '@/core/features/audience/ui/audience-import';

export const Route = createFileRoute('/app/audience_/import')({ component: editorLeaf(AudienceImportPage) });
