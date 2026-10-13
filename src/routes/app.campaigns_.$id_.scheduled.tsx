import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { CampaignScheduledPage } from '@/core/features/campaigns/ui/campaign-scheduled';
export const Route = createFileRoute('/app/campaigns_/$id_/scheduled')({component: editorLeaf(CampaignScheduledPage)});
