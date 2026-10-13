import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { SignInPage } from '@/core/app/client/public-pages';
import '@/core/app/client/ui/materials';
export const Route = createFileRoute('/signin')({component: editorLeaf(SignInPage)});
