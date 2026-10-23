import type {Database} from '@/core/platform/db/client';
import {sha256} from '@/core/shared/ids';
import {effectiveRole} from '@/core/features/auth/product-roles';
export const reportOperators=`FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id`;
export async function reportAuthority(database:Database,id:string) {
  const operator=await database.$client.prepare(`SELECT n.id,n.email,n.version,n.created_at,${effectiveRole} role ${reportOperators} WHERE n.id=? AND n.status='active'`).bind(id).first<{id:string;email:string;version:number;created_at:number;role:string}>();
  if(!operator||!['owner','admin'].includes(operator.role))return undefined;
  // oa_* authentication authority is excluded from archives. A restored product
  // profile cannot reactivate a schedule without a fresh Owner/Admin decision.
  return {operator,binding:await sha256(JSON.stringify([operator.id,operator.version,operator.created_at]))};
}
