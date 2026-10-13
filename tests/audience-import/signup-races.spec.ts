import {test, expect} from '@playwright/test';
import {native} from './native';
import {audienceSnapshot, existing, holdDatabase, protect, signup, type Transition} from './signup-race-harness';

for (const boundary of ['sender-settings', 'token-digest'] as const) {
  for (const state of ['hard-bounce', 'opt-out', 'confirmation', 'unchanged'] as const) {
    test(`CONT-005/009 confirmation preparation at ${boundary} respects committed ${state}`, async () => {
      const h = await native();
      let release = () => {};
      try {
        const email = 'handoff-race@example.test', prior = await existing(h, email);
        const sent = h.f.outbound.length;
        let calls = 0;
        const send = h.f.platform.mailer.send.bind(h.f.platform.mailer);
        h.f.platform.mailer.send = input => { calls++; return send(input); };
        const held = holdDatabase(h.f.db, sql => boundary === 'sender-settings' && /FROM sender_settings/i.test(sql));
        let paused = held.paused;
        release = held.release;
        if (boundary === 'token-digest') {
          let reached!: () => void;
          paused = new Promise<void>(resolve => { reached = resolve; });
          const resumed = new Promise<void>(resolve => { release = resolve; });
          const digest = h.f.platform.publicTokens.digest.bind(h.f.platform.publicTokens);
          h.f.platform.publicTokens.digest = async token => { reached(); await resumed; return digest(token); };
        }
        const response = signup(h, held.database)(email);
        await paused;
        if (state !== 'unchanged') await protect(h, prior, state);
        release();
        expect((await response).status).toBe(202);
        expect(calls).toBe(state === 'unchanged' ? 1 : 0);
        expect(h.f.outbound).toHaveLength(sent + (state === 'unchanged' ? 1 : 0));
      } finally { release(); await h.close(); }
    });
  }
}

for (const state of ['hard-bounce', 'opt-out', 'confirmation', 'erasure', 'unchanged'] as const) {
  test(`CONT-005/009 atomic public capture respects committed ${state} at its write boundary`, async () => {
    const h = await native();
    let release = () => {};
    try {
      const email = 'capture-race@example.test', prior = await existing(h, email);
      const sent = h.f.outbound.length;
      const held = holdDatabase(h.f.db, sql => /(?:insert\s+into|update)\s+["`]?\b(?:contacts|contact_email_addresses|consent_evidence)\b/i.test(sql));
      release = held.release;
      const response = signup(h, held.database)(email);
      await held.paused;
      if (state !== 'unchanged') await protect(h, prior, state as Transition);
      const before = await audienceSnapshot(h.f.db);
      release();
      expect((await response).status).toBe(202);
      if (state === 'unchanged') {
        expect(h.f.outbound).toHaveLength(sent + 1);
        expect(await h.f.db.prepare('SELECT display_name, email_status FROM contacts').first()).toEqual({display_name: 'Public replacement', email_status: 'pending'});
        expect(await h.f.db.prepare('SELECT count(*) AS count FROM consent_evidence').first()).toEqual({count: 2});
        expect(await h.f.db.prepare('SELECT count(*) AS count FROM consent_capture_metadata').first()).toEqual({count: 1});
      } else {
        expect(h.f.outbound).toHaveLength(sent);
        expect(await audienceSnapshot(h.f.db)).toEqual(before);
      }
    } finally { release(); await h.close(); }
  });
}
