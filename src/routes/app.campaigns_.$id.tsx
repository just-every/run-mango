import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { CampaignDetailPage } from '@/core/features/campaigns/ui/campaign-detail';
export const Route = createFileRoute('/app/campaigns_/$id')({component: editorLeaf(CampaignDetailPage)});
