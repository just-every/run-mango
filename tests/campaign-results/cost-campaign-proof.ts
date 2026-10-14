import { expect } from '@playwright/test';
import { native, approved } from '../approval-binding/native';

/** A real D1 failure after a real adapter's accepted HTTP response must not erase the receipt or resend. */
export async function proveCampaignCostFailure() {
  const harness=await native(), {f}=harness;
  try {
    const campaign=await approved(f);
    const before=f.outbound.length;
    await f.db.prepare("CREATE TRIGGER reject_cost_enrichment BEFORE UPDATE ON external_cost_facts WHEN NEW.outcome='accepted' BEGIN SELECT RAISE(ABORT,'cost-enrichment-unavailable'); END").run();
    await expect(f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'})).rejects.toThrow(/cost-enrichment-unavailable/);
    const recipient=await f.db.prepare('SELECT id,transport_disposition,provider_message_id FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).first<any>();
    expect(recipient).toMatchObject({transport_disposition:'accepted',provider_message_id:expect.any(String)});
    expect(recipient.provider_message_id.length).toBeGreaterThan(0);
    expect(f.outbound).toHaveLength(before+1);
    expect(await f.db.prepare('SELECT outcome,units_known,reported_cost_micros FROM external_cost_facts WHERE recipient_step_id=?').bind(recipient.id).first()).toEqual({outcome:'prepared',units_known:0,reported_cost_micros:null});
    await f.db.prepare('DROP TRIGGER reject_cost_enrichment').run();
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(before+1);
    expect(await f.db.prepare('SELECT transport_disposition,provider_message_id FROM recipient_steps WHERE id=?').bind(recipient.id).first()).toEqual({transport_disposition:'accepted',provider_message_id:recipient.provider_message_id});
  } finally {await harness.dispose();}
}
