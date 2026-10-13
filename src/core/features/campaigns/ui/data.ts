import type { CampaignCollection } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';

export function useCampaignCollection(filters: {state?:string;channel?:'email'|'sms'} = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string,string] => Boolean(entry[1])));
  return useResource<CampaignCollection>(`/api/campaigns${query.size ? `?${query}` : ''}`);
}
