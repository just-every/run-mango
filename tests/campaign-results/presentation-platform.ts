// Test-only adapter boundary; the native store routes and D1 run repository remain real.
import type { Platform } from '../../src/core/shared/platform';
export function presentationPlatform(platform:Platform, db:D1Database) {
  platform.commerce = {
    capabilities:()=>({provider:'presentation-fixture',sourceTypes:['customer'],detail:'Local test customer source.'}),
    async synchronize(){return {records:[]};},
    async verifyWebhook(){throw new Error('This fixture has no webhook source.');},
  };
  platform.jobs = {
    async enqueue(command){await db.prepare('INSERT INTO presentation_jobs(payload) VALUES(?)').bind(JSON.stringify(command)).run();},
    async retry(){throw new Error('This fixture does not retry jobs.');},
  };
  return platform;
}
