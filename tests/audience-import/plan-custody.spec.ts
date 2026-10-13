import {test, expect} from '@playwright/test';
import {native, files, consent} from './native';
import {sha256} from '../../src/vendor/base/import-kit/src/d1/index';

for (const format of ['chunked', 'inline'] as const) {
  test(`CONT-010 cached ${format} preview rejects a changed plan under the original reviewed fingerprint`, async () => {
    const h = await native();
    try {
      const input = {files: await files(), consent};
      const preview = await h.service.preview(input, h.context);
      expect(await h.service.preview(input, h.context)).toEqual(preview);
      const chunks = (await h.f.db.prepare('SELECT content FROM audience_import_plan_chunks WHERE fingerprint=? ORDER BY ordinal')
        .bind(preview.fingerprint).all<{content: string}>()).results;
      const plan = JSON.parse(chunks.map(row => row.content).join(''));
      plan.counts.rejected++;
      const changed = JSON.stringify(plan);
      await h.f.db.prepare('DELETE FROM audience_import_plan_chunks WHERE fingerprint=?').bind(preview.fingerprint).run();
      if (format === 'chunked') {
        await h.f.db.prepare('INSERT INTO audience_import_plan_chunks(fingerprint,ordinal,content) VALUES(?,0,?)').bind(preview.fingerprint, changed).run();
        await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?')
          .bind(JSON.stringify({format: 'mango-plan-chunks-v1', chunks: 1, sha256: sha256(changed)}), preview.fingerprint).run();
      } else {
        await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?').bind(changed, preview.fingerprint).run();
      }
      await expect(h.service.preview(input, h.context)).rejects.toThrow('fingerprint has changed');
      for (const table of ['contacts', 'ik_jobs']) expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count: 0});
      expect(h.f.outbound).toHaveLength(0);
    } finally { await h.close(); }
  });
}
