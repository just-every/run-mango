import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { CampaignReviewPage } from '@/core/features/campaigns/ui/campaign-review';
export const Route = createFileRoute('/app/campaigns_/$id_/review')({component: editorLeaf(CampaignReviewPage)});
