import type { D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';

const actor = Symbol('audience import operator');
type AudienceContext = D1ImportContext & { [actor]?: string };

export const audienceImportActor = (context: D1ImportContext) => (context as AudienceContext)[actor] ?? context.authorization.principalId;

/** The kit binds plans to their original principal. Equal Mango operators act on that
 * binding with their own live session predicate; neither the plan nor its attribution
 * is rewritten. Keep the acting operator separately for Mango's audit entries. */
export async function sharedAudienceImport(id: string, context: D1ImportContext): Promise<D1ImportContext> {
  if (context.destination !== 'mango') throw new Error('JOB_BINDING_MISMATCH');
  const row = await context.storage.database.prepare(`SELECT principal_id FROM ik_d1_streams WHERE id=? AND destination=? AND namespace=? AND mapping_version=?
    UNION ALL SELECT principal_id FROM ik_jobs WHERE id=? AND destination=? AND namespace=? AND mapping_version=? LIMIT 1`)
    .bind(id, context.destination, context.namespace, context.mappingVersion, id, context.destination, context.namespace, context.mappingVersion).first<{ principal_id: string }>();
  if (!row) throw new Error('IMPORT_JOB_NOT_FOUND');
  return { ...context, [actor]: audienceImportActor(context), authorization: { ...context.authorization, principalId: row.principal_id } } as AudienceContext;
}
