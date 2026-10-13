import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { ContactDetailPage } from '@/core/features/audience/ui/contact-detail';
export const Route = createFileRoute('/app/audience_/$id')({component: editorLeaf(ContactDetailPage)});
