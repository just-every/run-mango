import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { campaignStates } from '@/core/features/campaigns/result-model';
import { CampaignsPage } from '@/core/features/campaigns/ui/campaigns-page';
export const Route = createFileRoute('/app/campaigns')({validateSearch: (search:Record<string,unknown>):{state?:string;channel?:'email'|'sms'} => ({state:typeof search.state === 'string' && campaignStates.includes(search.state as typeof campaignStates[number]) ? search.state : undefined,channel:search.channel === 'email' || search.channel === 'sms' ? search.channel : undefined}),component: editorLeaf(CampaignsPage)});
